# Deko

[![Built with the Deno Standard Library](https://raw.githubusercontent.com/denoland/deno_std/main/badge.svg)](https://deno.land/std)

**_Deko_** is a simple WebSocket client for Deno. 

> [!WARNING]
> If you want to connect WebSocket on browsers, use [`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instead.

## Features

- [x] Easy to use.
- [x] Supports custom headers.
- [x] Passes the [Autobahn testsuite](https://github.com/crossbario/autobahn-testsuite).
- [x] Follows [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455) WebSocket implementation.

## Usage

To use this module, add this to your JS/TS file:

```ts
import * as deko from "https://deno.land/x/deko@0.1.0/mod.ts";
```

> [!NOTE]
> This module is also available on [jsr.io](https://jsr.io). See [@babia/deko](https://jsr.io/@babia/deko).

## API Docs

If you want to see module API, please check out the documentation [here](https://deno.land/x/deko?doc).

## Examples

#### Open event handle

```ts
import { Deko, OpCode } from "https://deno.land/x/deko@0.1.0/mod.ts";

const client = new Deko({ uri: "websocket url goes here" });

client.onOpen = () => {
  console.log("Connected to WebSocket server!");
}

await client.connect();
```


#### Receives a text message from WebSocket server

```ts
import { Deko, OpCode } from "https://deno.land/x/deko@0.1.0/mod.ts";

const client = new Deko({ uri: "websocket url goes here" });

client.onMessage = (_, message) => {
  if (message.opcode === OpCode.TextFrame) {
    console.log(new TextDecoder().decode(message.payload));
  }
}

await client.connect();
```

#### Sends a message to WebSocket server

```ts
import { Deko, OpCode } from "https://deno.land/x/deko@0.1.0/mod.ts";

const client = new Deko({ uri: "websocket url goes here" });

await client.connect();

setTimeout(async () => {
  await client.sendMessage("Hello World!");
}, 5000); // Sends message after 5 seconds
```

## License

This repository/module is under **MIT License**. See [LICENSE](./LICENSE).