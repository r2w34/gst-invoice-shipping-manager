import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return json({
    message: "Test route working!",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      BYPASS_AUTH: process.env.BYPASS_AUTH,
    }
  });
};

export default function Test() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>{data.message}</h1>
      <p><strong>Timestamp:</strong> {data.timestamp}</p>
      <p><strong>NODE_ENV:</strong> {data.env.NODE_ENV}</p>
      <p><strong>BYPASS_AUTH:</strong> {data.env.BYPASS_AUTH}</p>
    </div>
  );
}