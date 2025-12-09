
# Revised Specification: Multi-UOM + Category Price + Per-Store Pricing

Dokumen revisi ini memperbaiki versi sebelumnya dengan memasukkan kebutuhan terbaru:
Harga harus dapat berbeda berdasarkan kategori harga, satuan yang dipilih, dan store.

Final pricing logic menjadi berdasarkan kombinasi:
- Product
- UOM
- Price Category
- Store (opsional override)

---

## 1. Goals (Revised)

- Mendukung multi-level UOM per produk dengan conversion factor per produk.
- Mendukung harga berbeda per kategori (Retail, Wholesale, Member, dsb).
- Mendukung harga berbeda per UOM dan per kategori harga.
- Mendukung override harga per store.
- Semua stok tetap disimpan dalam base UOM untuk stabilitas penghitungan.
- Flow konsisten di purchasing, sales, dan laporan.

---

## 2. Revised Data Schema

### 2.1 Price Category

```sql
CREATE TABLE price_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL
);
```

Contoh data:
| id | name |
|---|---|
| RETAIL | Retail |
| WHOLESALE | Grosir |
| MEMBER | Member |

---

### 2.2 Product UOM Mapping (Existing but validated)

> Tidak berubah selain memastikan satu product hanya punya satu base UOM

```sql
CREATE TABLE product_uoms (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  conversion_factor REAL NOT NULL,
  is_base_unit BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE(product_id, uom_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (uom_id) REFERENCES uoms(id)
);
```

Rules:
- Satu baris wajib `is_base_unit = TRUE`
- `conversion_factor` base unit wajib bernilai `1`

---


### 2.3 NEW TABLE: Harga default berdasarkan kategori per UOM

```sql
CREATE TABLE product_uom_category_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  price_category_id TEXT NOT NULL,
  price REAL NOT NULL,

  UNIQUE (product_id, uom_id, price_category_id),

  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (uom_id) REFERENCES uoms(id),
  FOREIGN KEY (price_category_id) REFERENCES price_categories(id)
);
```

Contoh isi:

| product | uom | category | price |
|---|---|---|---|
| A | PCS | Retail | 6000 |
| A | PCS | Wholesale | 5200 |
| A | BOX | Retail | 55000 |
| A | BOX | Wholesale | 50000 |
| A | DUS | Wholesale | 230000 |

Jika tidak ada baris kategori tertentu → transaksi  kategori tersebut tidak diperbolehkan.

---

### 2.4 Revised Table Store Override

```sql
CREATE TABLE store_product_uom_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  price_category_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  price REAL NOT NULL,

  UNIQUE (product_id, uom_id, price_category_id, store_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (uom_id) REFERENCES uoms(id),
  FOREIGN KEY (price_category_id) REFERENCES price_categories(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);
```

Override berlaku hanya untuk store tertentu.

---

## 3. Price Resolution Logic (Revised)

Final logic dalam backend service:

```ts
async function resolvePrice({ productId, uomId, categoryId, storeId }) {
  const storePrice = await db.store_product_uom_prices.findOne({
    productId,
    uomId,
    price_category_id: categoryId,
    store_id: storeId
  })

  if (storePrice) return storePrice.price

  const defaultPrice = await db.product_uom_category_prices.findOne({
    productId,
    uomId,
    price_category_id: categoryId
  })

  if (defaultPrice) return defaultPrice.price

  throw new Error("Harga untuk kombinasi kategori dan satuan tidak tersedia.")
}
```

Prioritas:
1. Price override store
2. Default harga HQ
3. Error jika tidak ditemukan

---

## 4. Revised Sales Flow

Pada saat user memilih produk:

1. Load product UOM
2. User klik salah satu UOM
3. System load harga berdasarkan kategori yang tersedia
4. UI hanya menampilkan kategori yang tersedia untuk UOM tsb

Contoh:
Produk A:
- PCS hanya punya Retail
- DUS punya Retail & Wholesale

Maka UI:

| pilih UOM | kategori terlihat |
|---|---|
| PCS | Retail |
| DUS | Retail + Wholesale |

Ketika user submit:
- Sistem kirim payload:

```json
{
  "productId": "P001",
  "uomId": "UOM-DUS",
  "priceCategoryId": "WHOLESALE",
  "qty": 2,
  "baseQty": 200,
  "price": 230000
}
```

`baseQty = qty * conversion_factor`

---

## 5. Inventory Behavior (unchanged)

- Semua stok dicatat dalam base UOM
- Saat purchase atau sale:
- `baseQty = qtyInDisplayedUOM * conversionFactor`
- Saat display stok → konversi balik jika diperlukan

---

## 6. Edge Cases (Updated)

### ❌ UOM valid, kategori tidak punya harga di kombinasinya
UI tidak boleh memperbolehkan submit transaksi.

### ❌ Harga kategori HQ dihapus tapi store override ada
Store override tetap berlaku.

### ❌ Ada store override tapi user berada di store lain
Tidak berlaku, fallback HQ price.

### 🔥 Harga berbeda untuk kategori dan per UOM
Benar dan sesuai tujuan akhir sistem.

---

## 7. Kesimpulan

Dengan revisi ini:
✔ Multi UOM mendukung konversi valid per produk
✔ Harga fleksibel berdasarkan kategori
✔ Override per store tanpa memecah logika
✔ Flow sales tetap aman
✔ Data tetap konsisten di level stok (base unit only)

