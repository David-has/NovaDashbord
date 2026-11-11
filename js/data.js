const Data = (() => {
  function rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  const rand = rng(42);
  const DAYS = 180;

  const visitors = [];
  const orders = [];
  const revenue = [];

  for (let i = 0; i < DAYS; i++) {
    const weekly = 1 + 0.18 * Math.sin((i / 7) * Math.PI * 2);
    const growth = 1 + i / 400;
    const v = Math.round(900 * weekly * growth * (0.85 + rand() * 0.3));
    const o = Math.round(v * (0.032 + rand() * 0.014));

    visitors.push(v);
    orders.push(o);
    revenue.push(o * Math.round(180 + rand() * 80));
  }

  const names = [
    "Andrei Popescu", "Maria Ionescu", "Alexandru Dumitru", "Elena Stan",
    "Vlad Munteanu", "Ioana Georgescu", "Radu Constantin", "Ana Marin",
    "Mihai Toma", "Cristina Radu", "Bogdan Neagu", "Teodora Lazăr",
  ];

  const products = [
    "Abonament Pro", "Căști wireless", "Laptop Air 14", "Tastatură mecanică",
    "Monitor 27\"", "Cameră web HD", "Rucsac urban", "Suport laptop",
  ];

  const statuses = ["Livrată", "În procesare", "Anulată"];

  const orderRows = Array.from({ length: 32 }, (_, i) => ({
    id: 1001 + i,
    client: names[i % names.length],
    product: products[(i * 3) % products.length],
    amount: Math.round(80 + rand() * 1400),
    date: new Date(Date.now() - i * 0.9 * 864e5),
    status: statuses[i % 7 === 3 ? 2 : i % 3 === 1 ? 1 : 0],
  }));

  const sources = [
    ["Căutare organică", 42],
    ["Trafic direct", 27],
    ["Rețele sociale", 18],
    ["Email", 13],
  ];

  const activity = [
    ["Comandă nouă #1033 de la Maria Ionescu", "acum 4 min"],
    ["Plată confirmată pentru #1029", "acum 22 min"],
    ["Utilizator nou înregistrat", "acum 1 h"],
    ["Stoc scăzut: Căști wireless", "acum 3 h"],
    ["Raport săptămânal generat", "ieri"],
  ];

  const notifications = [
    { text: "Comandă nouă de 1.249 lei", time: "acum 4 min", unread: true },
    { text: "Stoc scăzut pentru Căști wireless", time: "acum 3 h", unread: true },
    { text: "Raportul lunar este gata", time: "ieri", unread: false },
  ];

  const defaultTasks = [
    { id: 1, text: "Verifică comenzile în procesare", done: false, prio: "high" },
    { id: 2, text: "Răspunde la mesajele clienților", done: false, prio: "normal" },
    { id: 3, text: "Actualizează prețurile din catalog", done: true, prio: "normal" },
  ];

  return {
    visitors, orders, revenue, orderRows, statuses,
    sources, activity, notifications, defaultTasks,
  };
})();