// A tiny SMTP server for tests: speaks enough of the protocol (EHLO, AUTH PLAIN/LOGIN, MAIL, RCPT, DATA, QUIT) for a real mail client
// to deliver to it. It keeps what it received so a test can check the actual message, and can be told to refuse recipients.
import net from 'node:net';

export interface Received { from: string; to: string[]; data: string; auth: boolean }
export interface FakeSmtp { port: number; received: Received[]; rejectRecipients: boolean; close: () => Promise<void> }

export async function startFakeSmtp(): Promise<FakeSmtp> {
  const received: Received[] = [];
  const state = { rejectRecipients: false };
  const server = net.createServer(sock => {
    sock.setEncoding('utf8');
    let buf = '', inData = false, cur: Received = { from: '', to: [], data: '', auth: false }, awaitingAuth: 'user' | 'pass' | null = null;
    const w = (s: string) => sock.write(s + '\r\n');
    w('220 fake.smtp ESMTP ready');
    sock.on('data', chunk => {
      buf += chunk;
      for (;;) {
        if (inData) {
          const end = buf.indexOf('\r\n.\r\n');
          if (end < 0) return;
          cur.data = buf.slice(0, end).replace(/\r\n\.\./g, '\r\n.');
          buf = buf.slice(end + 5);
          inData = false;
          received.push(cur);
          cur = { from: '', to: [], data: '', auth: cur.auth };
          w('250 2.0.0 queued');
          continue;
        }
        const i = buf.indexOf('\r\n');
        if (i < 0) return;
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (awaitingAuth === 'user') { awaitingAuth = 'pass'; w('334 UGFzc3dvcmQ6'); continue; }
        if (awaitingAuth === 'pass') { awaitingAuth = null; cur.auth = true; w('235 2.7.0 ok'); continue; }
        const cmd = line.toUpperCase();
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) { sock.write('250-fake.smtp\r\n250-8BITMIME\r\n250 AUTH PLAIN LOGIN\r\n'); }
        else if (cmd.startsWith('AUTH PLAIN')) { cur.auth = true; w('235 2.7.0 ok'); }
        else if (cmd.startsWith('AUTH LOGIN')) { awaitingAuth = 'user'; w('334 VXNlcm5hbWU6'); }
        else if (cmd.startsWith('MAIL FROM')) { cur.from = line.slice(10).replace(/[<>]/g, '').split(' ')[0]; w('250 ok'); }
        else if (cmd.startsWith('RCPT TO')) { if (state.rejectRecipients) w('550 5.1.1 no such mailbox'); else { cur.to.push(line.slice(8).replace(/[<>]/g, '').trim()); w('250 ok'); } }
        else if (cmd === 'DATA') { inData = true; w('354 end with <CRLF>.<CRLF>'); }
        else if (cmd === 'RSET') w('250 ok');
        else if (cmd === 'NOOP') w('250 ok');
        else if (cmd === 'QUIT') { w('221 bye'); sock.end(); return; }
        else w('502 not implemented');
      }
    });
    sock.on('error', () => { /* a client hanging up is fine */ });
  });
  await new Promise<void>(res => server.listen(0, '127.0.0.1', res));
  const port = (server.address() as net.AddressInfo).port;
  return {
    port, received,
    get rejectRecipients() { return state.rejectRecipients; },
    set rejectRecipients(v: boolean) { state.rejectRecipients = v; },
    close: () => new Promise<void>(res => { server.close(() => res()); (server as any).closeAllConnections?.(); }),
  } as FakeSmtp;
}

/** Header value from a raw message (first match, unfolded). */
export function header(raw: string, name: string): string | null {
  const head = raw.split(/\r\n\r\n/)[0].replace(/\r\n[ \t]+/g, ' ');
  const m = new RegExp(`^${name}:\\s*(.*)$`, 'im').exec(head);
  return m ? m[1].trim() : null;
}
/** Decode an RFC 2047 encoded word such as =?UTF-8?B?...?=. Plain text is returned unchanged. */
export function decodeWords(v: string): string {
  // whitespace between two encoded words is not part of the text (RFC 2047)
  return v.replace(/(\?=)\s+(=\?UTF-8\?)/gi, '$1$2').replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (_m, enc: string, txt: string) =>
    enc.toUpperCase() === 'B' ? Buffer.from(txt, 'base64').toString('utf8') : Buffer.from(txt.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_x, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8'));
}
