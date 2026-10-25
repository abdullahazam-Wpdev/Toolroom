import { describe,it,expect } from 'vitest';
import { jobDirectory,tokenHash,newToken,validateOptions,connection } from '../packages/jobs/runtime';
import { runCommand } from '../packages/jobs/process';
describe('Media job boundaries',()=>{
 it('rejects path traversal and arbitrary processing settings',()=>{expect(()=>jobDirectory('../../etc')).toThrow();expect(()=>validateOptions('video-converter','hls','balanced')).toThrow();expect(()=>validateOptions('video-converter','png','balanced')).toThrow();expect(()=>validateOptions('arbitrary','mp4','balanced')).toThrow();expect(validateOptions('background-remover','png','balanced').kind).toBe('background-remover');});
 it('issues unguessable tokens and stores a digest',()=>{const a=newToken(),b=newToken();expect(a).toHaveLength(64);expect(a).not.toBe(b);expect(tokenHash(a)).not.toBe(a);expect(tokenHash(a)).toHaveLength(64);});
 it('kills a real child at the deadline',async()=>{await expect(runCommand(process.execPath,['-e','setTimeout(()=>{},30000)'],{timeout:80})).rejects.toThrow('deadline');});
 it('cancels a real active child',async()=>{await expect(runCommand('/usr/bin/sleep',['30'],{cancelled:async()=>true})).rejects.toThrow('Cancelled');});
 it.runIf(Boolean(process.env.REDIS_URL))('does not throw on the first command of a freshly opened connection (cold-start regression)',async()=>{
  // Regression: enableOfflineQueue previously defaulted to false for
  // request-path connections, so the very first command issued before the
  // handshake finished threw "Stream isn't writeable" instead of queuing.
  const redis=connection();
  try{await expect(redis.eval("return redis.call('INCR',KEYS[1])",1,'toolroom:test-cold-start')).resolves.toBeTypeOf('number');}
  finally{redis.disconnect();}
 });
});
