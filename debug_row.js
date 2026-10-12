async function debug() {
  const mainUrl = 'https://reg.ftu.ac.th/registrar/studentset.asp?levelid=40&facultyid=4000&acadyear=2567&d1=2&semester=1';
  const res = await fetch(mainUrl);
  const cookie = res.headers.get('set-cookie') || '';
  const buf = await res.arrayBuffer();
  const html = new TextDecoder('windows-874').decode(buf);
  const m = html.match(/href=["']?(studentset\.asp\?cmd=1[^"' >]+)["']?/i);
  
  if (m) {
    const subUrl = 'https://reg.ftu.ac.th/registrar/' + m[1];
    const subRes = await fetch(subUrl, {
      headers: { 'Cookie': cookie, 'Referer': mainUrl }
    });
    const subBuf = await subRes.arrayBuffer();
    const subHtml = new TextDecoder('windows-874').decode(subBuf);
    
    // find where row has student numbers
    const rows = subHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (let r of rows) {
      if (r.includes('681441') || r.includes('671441') || r.includes('ปกติ') || r.includes('กูมุคลิซ') || r.includes('ชารีฟ')) {
        console.log('--- FOUND ROW ---');
        console.log(r);
        break;
      }
    }
  }
}
debug();
