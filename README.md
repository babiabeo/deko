# Deko

[![Built with the Deno Standard Library](https://raw.githubusercontent.com/denoland/deno_std/main/badge.svg)](https://deno.land/std)

**_Deko_** is a simple WebSocket client for Deno. 

> [!WARNING]
> If you want to connect WebSocket on browsers, use [`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instead.

## Features

- [x] Easy to use.
- [x] Supports custom headers.
- [x] Passes the [Autobahn testsuite](https://github.com/crossbario/autobahn-testsuite). [^report]
- [x] Follows [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455) WebSocket implementation.

## Usage

This package is available on [jsr.io](https://jsr.io).

Use `deno add` command to add this package to your project:

```
deno add @babia/deko
```

Then, import it in your source file:

```ts
import { Deko } from "@babia/deko";
```

Or use `jsr:` specifier if you want to use an install step.

```ts
import { Deko } from "jsr:@babia/deko@^0.1.0";
```

## Examples

#### Open event handle

```ts
import { Deko, OpCode } from "@babia/deko";

const client = new Deko({ uri: "websocket url goes here" });

client.onOpen = () => {
  console.log("Connected to WebSocket server!");
}

await client.connect();
```


#### Receives a text message from WebSocket server

```ts
import { Deko, OpCode } from "@babia/deko";

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
import { Deko, OpCode } from "@babia/deko";

const client = new Deko({ uri: "websocket url goes here" });

await client.connect();

setTimeout(async () => {
  await client.sendMessage("Hello World!");
}, 5000); // Sends message after 5 seconds
```

## License

This repository/package is under **MIT License**. See [LICENSE](./LICENSE).

[^report]: https://babiabeo.github.io/autobahn/deko/