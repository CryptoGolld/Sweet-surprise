import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateMoveToml, generateMoveSource } from '@/lib/coin-template';

// Simple in-memory cache (replace with Redis in production)
const compileCache = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const { ticker, name, description } = body;
    
    if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
      return NextResponse.json(
        { error: 'Invalid ticker: must be 1-10 characters' },
        { status: 400 }
      );
    }
    
    if (!name || typeof name !== 'string' || name.length > 50) {
      return NextResponse.json(
        { error: 'Invalid name: must be 1-50 characters' },
        { status: 400 }
      );
    }
    
    // 2. Check cache (same ticker/name = same bytecode)
    const cacheKey = `${ticker}_${name}`.toLowerCase();
    const cached = compileCache.get(cacheKey);
    if (cached) {
      console.log('✅ Returning cached compilation');
      return NextResponse.json(cached);
    }
    
    // 3. Generate Move code in temp directory
    const tempId = `${ticker.toLowerCase()}_${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'suilfg_coins', tempId);
    const sourcesDir = path.join(tempDir, 'sources');
    
    fs.mkdirSync(sourcesDir, { recursive: true });
    
    // Write Move.toml
    const moveToml = generateMoveToml({
      ticker: ticker.toUpperCase(),
      name: name,
      description: description || `${name} - Launched on SuiLFG MemeFi`,
      decimals: 9,
    });
    fs.writeFileSync(path.join(tempDir, 'Move.toml'), moveToml);
    
    // Write source code
    const moveSource = generateMoveSource({
      ticker: ticker.toUpperCase(),
      name: name,
      description: description || `${name} - Launched on SuiLFG MemeFi`,
      decimals: 9,
    });
    fs.writeFileSync(
      path.join(sourcesDir, `${ticker.toLowerCase()}.move`),
      moveSource
    );
    
    // 4. Compile to bytecode
    console.log('📦 Compiling package...');
    try {
      execSync(
        `cd ${tempDir} && sui move build 2>&1`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
    } catch (buildError: any) {
      console.error('Build error:', buildError.message);
      throw new Error(`Compilation failed: ${buildError.message}`);
    }
    
    // 5. Read compiled bytecode modules
    const buildDir = path.join(tempDir, 'build', ticker.toLowerCase());
    const bytecodeModulesPath = path.join(buildDir, 'bytecode_modules');
    
    if (!fs.existsSync(bytecodeModulesPath)) {
      throw new Error('Build failed: bytecode modules not found');
    }
    
    const moduleFiles = fs.readdirSync(bytecodeModulesPath);
    const modules = moduleFiles.map(file => {
      const modulePath = path.join(bytecodeModulesPath, file);
      const bytecode = fs.readFileSync(modulePath);
      return Array.from(bytecode); // Convert to number array for JSON
    });
    
    // 6. Get dependencies from build
    const dependencies = ['0x1', '0x2']; // Sui standard dependencies
    
    // 7. Prepare response
    const result = {
      success: true,
      modules: modules,
      dependencies: dependencies,
      moduleName: ticker.toLowerCase(),
      structName: `${ticker.toUpperCase()}_SUILFG_MEMEFI`,
    };
    
    // 8. Cache for 1 hour
    compileCache.set(cacheKey, result);
    setTimeout(() => compileCache.delete(cacheKey), 3600000);
    
    // 9. Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to clean up temp directory:', e);
    }
    
    console.log('✅ Compilation successful!');
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Compilation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to compile coin',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
