# Arouter Token Limit Full Patch

Patch nay them gioi han token theo tung API key vao trang:

`http://localhost:1508/dashboard/endpoint`

## Chay nhanh

```bash
cd arouter
npm install
PORT=1508 NEXT_PUBLIC_BASE_URL=http://localhost:1508 npm run dev
```

Mo:

```txt
http://localhost:1508/dashboard/endpoint
```

## Du lieu luu o dau?

Mac dinh luu tai:

```txt
.arouter-token-quota.json
```

Co the doi bang env:

```bash
TOKEN_QUOTA_DATA_DIR=/data PORT=1508 NEXT_PUBLIC_BASE_URL=http://localhost:1508 npm run dev
```

