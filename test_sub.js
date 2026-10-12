async function test() {
  const mainUrl = 'https://reg.ftu.ac.th/registrar/studentset.asp?levelid=40&facultyid=4000&acadyear=2567&d1=2&semester=1';
  const res = await fetch(mainUrl);
  const cookie = res.headers.get('set-cookie');
  console.log('Set-Cookie:', cookie);

  const buf = await res.arrayBuffer();
  const html = new TextDecoder('windows-874').decode(buf);
  const m = html.match(/href=["']?(studentset\.asp\?cmd=1[^"' >]+)["']?/i);
  console.log('Found link:', m ? m[1] : 'none');

  if (m) {
    const subUrl = 'https://reg.ftu.ac.th/registrar/' + m[1];
    console.log('Fetching:', subUrl);
    const subRes = await fetch(subUrl, {
      headers: {
        'Cookie': cookie || '',
        'Referer': mainUrl,
      }
    });
    const subBuf = await subRes.arrayBuffer();
    const subHtml = new TextDecoder('windows-874').decode(subBuf);
    console.log('SubHTML length:', subHtml.length);
    console.log('Matches student table:', subHtml.includes('รหัสประจำตัว'));
    const rows = subHtml.match(/<tr[\s\S]*?<\/tr>/gi);
    console.log('Row count:', rows ? rows.length : 0);
    if (rows) {
      for(let i=0; i<Math.min(10, rows.length); i++) {
        const text = rows[i].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) console.log(`Row ${i}:`, text);
      }
    }
  }
}

test();
