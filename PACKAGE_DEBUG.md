# Package Debug Notes

## Issue: VMVerificationOrDeserializationError

We're getting `VMVerificationOrDeserializationError in command 0` when trying to call functions on the newly published package.

### Packages Published:
1. First attempt: `0xcd0f27ed92bf9350e7238c2121e3725e6b5d73bc30934f3d8e9ad399d56c495b`
2. Second attempt: `0x5e62304e1e37f7593b6eee7a4281a69751edde6020563447afb53d37c2a2541c`

### Test Coin:
- Package: `0xed3774952bbeb21a5bc55c1e7259c5107393cf5e33be408b8f10b342200b5a97`
- Treasury: `0xfd6836bc58074bf72ffd509be6d652dbc80f1a87fcc7997f9a24b8919d507931`
- Type: `0xed3774952bbeb21a5bc55c1e7259c5107393cf5e33be408b8f10b342200b5a97::graduation_test::GRADUATION_TEST`

### Error Pattern:
All calls to `create_new_meme_token` fail with VMVerificationOrDeserializationError.

### Potential Causes:
1. Package bytecode mismatch
2. Dependency version issues (testnet vs mainnet)
3. Shared object initialization issues
4. Coin type compatibility

### Next Steps:
- Try with old package (0x39d07...) to see if it's a package issue
- Test with different coin type
- Check if PlatformConfig needs initialization
