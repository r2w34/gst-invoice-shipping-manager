import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "~/shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  if (url.searchParams.get("shop")) {
    throw await login(request);
  }

  return json({ showForm: true });
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();
  
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>GST Invoice & Shipping Manager</h1>
        <p className={styles.text}>
          Complete GST Invoicing + CRM + Label Management solution for Indian Shopify merchants
        </p>
        {showForm && (
          <Form method="post" action="/auth/login" className={styles.form}>
            <label className={styles.label}>
              <span>Shop domain</span>
              <input 
                className={styles.input}
                type="text" 
                name="shop" 
                placeholder="my-shop-domain.myshopify.com"
                required
              />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Install App
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>GST Compliant Invoices</strong>. Generate GST-compliant invoices automatically with proper tax calculations.
          </li>
          <li>
            <strong>Customer CRM</strong>. Centralized dashboard to manage all your customers and their order history.
          </li>
          <li>
            <strong>Shipping Labels</strong>. Create professional shipping labels with barcodes and tracking IDs.
          </li>
          <li>
            <strong>Bulk Operations</strong>. Process multiple orders, invoices, and labels at once to save time.
          </li>
        </ul>
      </div>
    </div>
  );
}