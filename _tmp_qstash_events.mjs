import fs from "node:fs";
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
}

const res = await fetch("https://qstash.upstash.io/v2/events?count=20", {
  headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
});
const data = await res.json();
for (const e of data.events ?? data.cursor ? data.events : data) {
  console.log(new Date(e.time).toISOString(), e.state, e.messageId, e.url, e.responseStatusCode ?? "");
}
console.log(JSON.stringify(data).slice(0, 500));
