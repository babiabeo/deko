// Based on: https://github.com/websockets/ws/blob/e173423c180dc1e4e6ee8938d9e4376a7a8b9757/test/autobahn.js

import process from "node:process";
import { Deko } from "../mod.ts";

const decoder = new TextDecoder();

let currentTest = 1;
let testCount = 0;

async function nextTest() {
  let ws: Deko;

  if (currentTest > testCount) {
    ws = new Deko({ uri: "ws://localhost:9001/updateReports?agent=deko" });
    await ws.connect();
    return;
  }

  console.log(`Running test case ${currentTest}/${testCount}`);

  ws = new Deko(
    { uri: `ws://localhost:9001/runCase?case=${currentTest}&agent=deko` },
  );
  ws.onMessage = async (mes) => {
    await ws.send(mes);
  };
  ws.onClose = () => {
    currentTest++;
    process.nextTick(nextTest);
  };
  ws.onError = (e) => console.error(e);
  await ws.connect();
}

const ws = new Deko({ uri: "ws://localhost:9001/getCaseCount" });
ws.onMessage = (data) => {
  testCount = parseInt(decoder.decode(data.payload));
};

ws.onClose = async () => {
  if (testCount > 0) {
    await nextTest();
  }
};
await ws.connect();
