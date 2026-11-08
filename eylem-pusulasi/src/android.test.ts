import { describe,it,expect,vi } from 'vitest';
describe('Android bridge',()=>{
  it('normal web sürümünde native çağrı yapmaz',async()=>{
    const {isAndroidApp,sendAndroidMessage}=await import('./android');
    expect(isAndroidApp).toBe(false);
    expect(()=>sendAndroidMessage('export','{}','backup.json')).toThrow();
  });
  it('Android sürümünde sadece istenen yedeği yerel bileşene verir',async()=>{
    vi.stubEnv('VITE_ANDROID_APP','true');
    vi.resetModules();
    const postMessage=vi.fn();vi.stubGlobal('window',{EylemNative:{postMessage}});
    const {isAndroidApp,sendAndroidMessage}=await import('./android');
    expect(isAndroidApp).toBe(true);
    sendAndroidMessage('export','{"format":"eylem-pusulasi"}','eylem-pusulasi-2026-11-08.json');
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({action:'export',data:'{"format":"eylem-pusulasi"}',filename:'eylem-pusulasi-2026-11-08.json'});
    vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules();
  });
});
