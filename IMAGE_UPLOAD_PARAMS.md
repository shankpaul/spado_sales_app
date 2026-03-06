# Order Image Upload - Parameter Format

## Quick Reference

### ✅ CORRECT Field Names (Go API)

```javascript
// For multiple images - use same field name (NO brackets)
formData.append('before_images', file1);
formData.append('before_images', file2);
formData.append('after_images', file3);

// For single images
formData.append('customer_signature', signatureFile);
formData.append('payment_proof', paymentFile);
formData.append('google_review_image', reviewFile);

// Optional JSON data
formData.append('data', JSON.stringify({ notes: 'Updated', payment_status: 'paid' }));
```

### ❌ WRONG (Do NOT use)

```javascript
// Don't use array brackets []
formData.append('before_images[]', file);  // WRONG
formData.append('after_images[]', file);   // WRONG
```

## Field Names

| Field Name | Type | Go API Handler Field |
|------------|------|---------------------|
| `before_images` | Multiple files | `form.File["before_images"]` |
| `after_images` | Multiple files | `form.File["after_images"]` |
| `customer_signature` | Single file | `form.File["customer_signature"]` |
| `payment_proof` | Single file | `form.File["payment_proof"]` |
| `google_review_image` | Single file | `form.File["google_review_image"]` |
| `data` | JSON string | `c.FormValue("data")` |

## Usage with orderService

```javascript
import orderService from '../services/orderService';

// Example 1: Upload before and after images
const handleUploadImages = async (orderId, beforeFiles, afterFiles) => {
  try {
    const result = await orderService.updateOrderWithImages(
      orderId,
      { notes: 'Service completed' },  // Optional order data
      {
        beforeImages: beforeFiles,     // Array of File objects
        afterImages: afterFiles         // Array of File objects
      }
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Example 2: Upload payment proof only
const handleUploadPayment = async (orderId, paymentFile) => {
  const result = await orderService.updateOrderWithImages(
    orderId,
    null,  // No order data to update
    { paymentProof: paymentFile }
  );
};

// Example 3: Upload all image types
const handleUploadAll = async (orderId) => {
  const result = await orderService.updateOrderWithImages(
    orderId,
    { payment_status: 'paid', notes: 'All documents received' },
    {
      beforeImages: [file1, file2],
      afterImages: [file3, file4],
      customerSignature: signatureFile,
      paymentProof: paymentFile,
      googleReviewImage: reviewFile
    }
  );
};
```

## API Response

```json
{
  "message": "Order data updated successfully",
  "order": {
    "id": 123,
    "order_number": "ORD-2026-001",
    "image_urls": {
      "before_images": [
        "http://localhost:8000/storage/orders/before-images/uuid1.jpg",
        "http://localhost:8000/storage/orders/before-images/uuid2.jpg"
      ],
      "after_images": [
        "http://localhost:8000/storage/orders/after-images/uuid1.jpg"
      ],
      "customer_signature": "http://localhost:8000/storage/orders/signatures/uuid.png",
      "payment_proof": "http://localhost:8000/storage/orders/payment-proofs/uuid.jpg",
      "google_review_image": null
    }
  }
}
```

## Important Notes

1. **Multiple Files**: Append with same field name (no `[]` brackets)
2. **Before/After**: New images are **appended** to existing ones
3. **Single Files**: New upload **replaces** old file (previous deleted)
4. **Content-Type**: Set automatically by axios/fetch - don't override
5. **File Size**: Max 50MB total request (Go API limit)
