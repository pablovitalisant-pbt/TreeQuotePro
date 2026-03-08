import { createAuthClient } from "@neondatabase/neon-js/auth";

export const auth = createAuthClient(window.location.origin, {
  // @ts-ignore
  redirectURI: window.location.origin,
});

export const sendToGHL = async (userData: { 
  first_name: string; 
  last_name: string; 
  email: string; 
  phone: string; 
  company_name: string; 
}) => {
  const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/NJoPCVCXfLOodeGp7oS8/webhook-trigger/fc4cea9d-a6e8-42d9-9aa7-83c85e1a1c08";
  
  try {
    console.log("Sending data to GoHighLevel...", userData);
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        company_name: userData.company_name,
        source: "TreeQuote Pro App",
      }),
    });

    if (!response.ok) {
      console.error("GHL Webhook failed with status:", response.status);
    } else {
      console.log("GHL Webhook sent successfully");
    }
  } catch (error) {
    // Manejo de Errores: Asegúrate de que si el Webhook falla, el usuario aún así pueda entrar a su cuenta
    console.error("Error sending to GHL:", error);
  }
};
