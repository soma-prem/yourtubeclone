"use client";

import axiosInstance from '@/lib/axiosinstance';
import { toast } from 'sonner';

export default function UpgradeButton({ user, plan }: { user: any, plan: string }) {
  const handleUpgrade = async () => {
    try {
      const { data } = await axiosInstance.post('/create-checkout-session', {
        userId: user._id,
        email: user.email,
        plan: plan, 
      });

      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        toast.error("Failed to create checkout session.");
      }
    } catch (error) {
      console.error("Payment Error", error);
      toast.error("Failed to start payment");
    }
  };

  return (
    <button 
      onClick={handleUpgrade}
      className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
    >
      Upgrade to Premium (₹99)
    </button>
  );
}