








export const isSouthIndia = (stateName: string): boolean => {
  const southIndianStates = [
    "Tamil Nadu",
    "Kerala",
    "Karnataka",
    "Andhra Pradesh",
    "Telangana"
  ];
  
  const result = southIndianStates.some(
    (state) => state.toLowerCase() === stateName?.trim().toLowerCase()
  );

  console.log(`[GeoUtils] Checking if "${stateName}" is in South India:`, result);
  return result;
};





export const getUserState = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) return null;
    
    const data = await response.json();
    console.log("[GeoUtils] Raw Geo-IP Data:", data);

    
    const region = data.region || null;
    console.log(`[GeoUtils] Detected Region: ${region}`);
    return region;
  } catch {
    return null;
  }
};






export const isWithinTimeRange = (): boolean => {
  const now = new Date();
  
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

  const currentTimeInMinutes = hour * 60 + minute;
  const startLimit = 10 * 60; 
  const endLimit = 12 * 60;   

  const result = currentTimeInMinutes >= startLimit && currentTimeInMinutes <= endLimit;

  console.log(`[TimeZoneUtils] Current IST Time: ${hour}:${minute.toString().padStart(2, "0")}`);
  console.log(`[TimeZoneUtils] Is within 10:00 AM - 12:00 PM IST?`, result);

  return result;
};
