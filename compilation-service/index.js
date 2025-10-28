#!/usr/bin/env node

/**
 * Standalone Compilation Service for SuiLFG MemeFi
 * Compiles Move packages and returns bytecode
 * Runs independently from Next.js frontend
 */

const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS so Vercel frontend can call this API
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Set to your Vercel URL in production
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// In-memory cache (replace with Redis for multi-instance deployments)
const compileCache = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Compilation endpoint
app.post('/compile', async (req, res) => {
  try {
    const { ticker, name, description, imageUrl } = req.body;
    
    // Validate inputs
    if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker: must be 1-10 characters'
      });
    }
    
    if (!name || typeof name !== 'string' || name.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid name: must be 1-50 characters'
      });
    }
    
    // Check cache
    const cacheKey = `${ticker}_${name}`.toLowerCase();
    const cached = compileCache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for: ${cacheKey}`);
      return res.json(cached);
    }
    
  console.log(`📦 Compiling: ${ticker} - ${name}`);
    
    // Generate temp directory
    const tempId = `${ticker.toLowerCase()}_${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'suilfg_coins', tempId);
    const sourcesDir = path.join(tempDir, 'sources');
    
    fs.mkdirSync(sourcesDir, { recursive: true });
    
    // Generate Move.toml
    const moduleName = ticker.toLowerCase();
    const moveToml = `[package]
name = "${moduleName}"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.42.2" }

[addresses]
${moduleName} = "0x0"
`;
    
    fs.writeFileSync(path.join(tempDir, 'Move.toml'), moveToml);
    
    // Helpers to safely embed strings in Move byte string literals
    const escapeBytesLiteral = (s = '') =>
      String(s)
        .replace(/\\/g, '\\\\')
        .replace(/\"/g, '\\"');

    // Generate Move source
    const witnessName = ticker.toUpperCase(); // Must match module name for one-time witness
    const safeName = escapeBytesLiteral(name);
    const desc = description || `${name} - Launched on SuiLFG MemeFi`;
    const safeDesc = escapeBytesLiteral(desc);
    const safeImageUrl = imageUrl ? escapeBytesLiteral(imageUrl) : '';
    
    // Handle image URL
    const iconOption = imageUrl 
      ? `option::some(url::new_unsafe_from_bytes(b"${safeImageUrl}"))` 
      : `option::none()`;
    
    const moveSource = `module ${moduleName}::${moduleName} {
    use sui::coin;
    use std::option;
    use sui::url;
    use sui::transfer;
    use sui::tx_context::{TxContext};
    use sui::tx_context as tx_context;

    /// One-time witness (must match module name in uppercase)
    public struct ${witnessName} has drop {}

    /// Initialize the coin and create TreasuryCap
    fun init(witness: ${witnessName}, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            9,
            b"${ticker.toUpperCase()}",
            b"${safeName}",
            b"${safeDesc}",
            ${iconOption},
            ctx
        );
        
        // Freeze metadata so it can't be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer TreasuryCap to sender (will be used by bonding curve)
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
`;
    
    fs.writeFileSync(
      path.join(sourcesDir, `${moduleName}.move`),
      moveSource
    );
    
    // Compile
    console.log(`  🔨 Building package...`);
    
    // Try to find sui binary (check common locations)
    const suiPath = process.env.SUI_PATH || '/home/ubuntu/sui/sui';
    
    let buildOutput;
    try {
      buildOutput = execSync(
        `cd ${tempDir} && ${suiPath} move build 2>&1`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      console.log('  📝 Build output:', buildOutput);
    } catch (buildError) {
      console.error('  ❌ Build error stdout:', buildError.stdout);
      console.error('  ❌ Build error stderr:', buildError.stderr);
      console.error('  ❌ Build error message:', buildError.message);
      
      const errorDetails = buildError.stderr || buildError.stdout || buildError.message;
      throw new Error(`Compilation failed:\n${errorDetails}`);
    }
    
    // Read compiled bytecode
    const buildDir = path.join(tempDir, 'build', moduleName);
    const bytecodeModulesPath = path.join(buildDir, 'bytecode_modules');
    
    if (!fs.existsSync(bytecodeModulesPath)) {
      throw new Error('Build failed: bytecode modules not found');
    }
    
    const moduleFiles = fs.readdirSync(bytecodeModulesPath);
    const modules = moduleFiles
      .filter(file => {
        const modulePath = path.join(bytecodeModulesPath, file);
        return fs.statSync(modulePath).isFile(); // Only process files, not directories
      })
      .map(file => {
        const modulePath = path.join(bytecodeModulesPath, file);
        const bytecode = fs.readFileSync(modulePath);
        return Array.from(bytecode);
      });
    
    // Prepare response
    const result = {
      success: true,
      modules: modules,
      dependencies: ['0x1', '0x2'],
      moduleName: moduleName,
      structName: witnessName, // The witness struct name
      timestamp: Date.now(),
    };
    
    // Cache for 1 hour
    compileCache.set(cacheKey, result);
    setTimeout(() => compileCache.delete(cacheKey), 3600000);
    
    // Clean up
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('  ⚠️  Failed to clean temp dir:', e.message);
    }
    
    console.log(`  ✅ Compiled successfully!`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Compilation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Compilation failed',
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 SuiLFG MemeFi Compilation Service                       ║
╚══════════════════════════════════════════════════════════════╝

Status: Running ✅
Port: ${PORT}
Endpoints:
  - GET  /health       → Health check
  - POST /compile      → Compile Move package

Ready to compile coins! 🎉
`);
});
