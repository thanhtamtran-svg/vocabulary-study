export function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}

export function formatDate(d) {
  return d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function getStudyDay(startDate, today) {
  let count = 0;
  let d = new Date(startDate);
  while (d <= today) {
    if (d.getDay() !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function todayDate() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}
