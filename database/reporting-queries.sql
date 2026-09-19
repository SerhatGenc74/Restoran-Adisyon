-- Z raporu için tamamlanmış ve iade/iptal edilmemiş ödemeler esas alınır.
-- :start_at ve :end_at değerleri uygulama tarafından aynı zaman diliminde
-- (işletmenin yerel zamanı) gönderilmelidir.

-- Genel ciro, ödeme yöntemi ve ikram toplamı
SELECT
  COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'CASH'), 0) AS cash_revenue,
  COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'CARD'), 0) AS card_revenue,
  COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'OTHER'), 0) AS other_revenue,
  COALESCE(SUM(p.amount), 0) AS total_revenue,
  COALESCE((
    SELECT SUM(oi.line_total)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.is_complimentary = true
      AND o.closed_at >= :start_at
      AND o.closed_at < :end_at
      AND o.status = 'PAID'
  ), 0) AS complimentary_total
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.paid_at >= :start_at
  AND p.paid_at < :end_at
  AND p.status = 'COMPLETED'
  AND o.status = 'PAID';

-- En çok satılan ürünler (ikramlar dahil; gelir hesabı payment üzerinden yapılır)
SELECT
  p.id,
  p.name,
  p.type,
  SUM(oi.quantity) AS quantity,
  SUM(oi.line_total) AS listed_total,
  SUM(oi.line_total) FILTER (WHERE oi.is_complimentary = true) AS complimentary_total
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.closed_at >= :start_at
  AND o.closed_at < :end_at
  AND o.status = 'PAID'
  AND oi.status <> 'CANCELLED'
GROUP BY p.id, p.name, p.type
ORDER BY quantity DESC;

-- Gün içindeki ödenmiş adisyon sayısı
SELECT COUNT(DISTINCT o.id) AS order_count
FROM orders o
JOIN payments p ON p.order_id = o.id
WHERE p.paid_at >= :start_at
  AND p.paid_at < :end_at
  AND p.status = 'COMPLETED'
  AND o.status = 'PAID';
