async function test() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbzRcJuzvfN2W7AHiCXdDU13tKRQz3nPWTTNzyybylmuEJ4SSr0zG-0sGguaCOWfG2XL1g/exec?action=get_all');
  const data = await res.json();
  const students = data.students || [];
  console.log('จำนวนนักศึกษาทั้งหมด:', students.length, 'คน');

  const majorStats = {};
  students.forEach(s => {
    const m = s.Major || 'ว่าง';
    majorStats[m] = (majorStats[m] || 0) + 1;
  });
  console.log('\n📊 สถิตินักศึกษาแยกตามสาขาวิชาใน Google Sheet:');
  console.log(majorStats);

  console.log('\n🔍 สุ่มตรวจตัวอย่าง 5 คน:');
  const sample = [students[2], students[150], students[300], students[600], students[students.length - 1]];
  sample.forEach((s, i) => {
    if (s) {
      console.log((i + 1) + '. รหัส ' + s.StudentID + ' -> ' + s.Name + ' [' + s.Major + '] ชั้นปี ' + s.YearLevel);
    }
  });
}

test();
