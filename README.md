## Getting Started

First, run the development server:

```bash
pnpm dev
```

## Build Dev

```bash
docker build -t local/image-compressor .
```

## Run Build Dev

```bash
docker run --rm -p 3030:3000 local/image-compressor
```
