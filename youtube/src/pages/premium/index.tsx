"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Check, Crown, Shield, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/AuthContext';
import axiosInstance from '@/lib/axiosinstance';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import Link from 'next/link';

const plans = [
  {
    name: "FREE",
    price: 0,
    time: "5 minutes",
    color: "from-gray-400 to-gray-600",
    textcolor: "text-xl text-blue-500 font-bold",
  },
  {
    name: "BRONZE",
    price: 50,
    time: "7 minutes",
    color: "from-yellow-500 to-orange-500",
    textcolor: "text-xl text-yellow-800 font-bold",
  },
  {
    name: "SILVER",
    price: 100,
    time: "10 minutes",
    color: "from-slate-400 to-slate-600",
    textcolor: "text-xl text-muted-foreground font-bold",
  },
  {
    name: "GOLD",
    price: 200,
    time: "Unlimited",
    color: "from-emerald-500 to-green-600",
    textcolor: "text-xl text-amber-500 font-bold",
  },
];

const PremiumPage = () => {
  const { user, login } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();
  const pollingRef = useRef(false);

  
  useEffect(() => {
    
    const { success, canceled, plan } = router.query;

    if (success === 'true' && plan && user && !pollingRef.current) {
      pollingRef.current = true;
      const targetPlan = String(plan); 
      
      toast.loading(`Finalizing ${targetPlan} Upgrade...`);

      const finalizeUpgrade = async () => {
        try {
          
          await axiosInstance.post("/user/upgrade", { 
            userId: user._id, 
            plan: targetPlan 
          });

          
          let attempts = 0;
          const maxAttempts = 5;

          const checkStatus = async () => {
            try {
              const res = await axiosInstance.get(`/user/status/${user._id}`);

              
              if (res.data.plan === targetPlan) {
                toast.dismiss();
                toast.success(`Upgrade Successful! You are now ${targetPlan}.`);
                login({ ...user, plan: targetPlan }); 
                setTimeout(() => router.replace('/'), 2000);
                return;
              }

              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(checkStatus, 1000);
              } else {
                
                toast.dismiss();
                toast.success(`${targetPlan} activated! Please refresh if not visible.`);
                login({ ...user, plan: targetPlan });
                router.replace('/');
              }
            } catch (error) {
              console.error("Status check failed", error);
            }
          };

          checkStatus();

        } catch (error) {
          console.error("Manual upgrade failed", error);
          toast.dismiss();
          toast.error("Upgrade verification failed.");
        }
      };

      finalizeUpgrade();
    }

    if (canceled === 'true') {
      toast.error("Payment canceled.");
      router.replace('/premium'); 
    }
  }, [router.query, user, login, router]);

  const handleUpgrade = async (planName: string) => {
    if (!user) {
      toast.error("Please sign in to upgrade.");
      router.push('/');
      return;
    }

    setLoadingPlan(planName);

    try {
      
      const { data } = await axiosInstance.post('/create-checkout-session', {
        userId: user._id,
        email: user.email,
        plan: planName, 
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create checkout session.");
        setLoadingPlan(null);
      }

    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error("Failed to start payment.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </div>

      <div className="flex-col items-center justify-center p-10">
        <div className="w-full text-center mb-8">
          <h1 className="text-4xl font-extrabold text-foreground">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground mt-2">
            Upgrade anytime. One-time payment. No subscriptions.
          </p>
        </div>

        <div className="max-w-6xl w-full grid md:grid-cols-4 gap-5 items-center">
          {plans.map((plan) => (
            <div key={plan.name} className="relative">
              <div className={`absolute -inset-1 bg-gradient-to-r ${plan.color} rounded-2xl blur opacity-20`}></div>
              <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border relative overflow-hidden">
                {user?.plan === plan.name && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                    Current Plan
                  </div>
                )}
                <div className="text-center mb-8 pt-4">
                  <h2 className={`${plan.textcolor}`}>{plan.name}</h2>
                  <div className="mt-6 flex items-baseline justify-center gap-3">
                    <span className="text-5xl font-extrabold tracking-tighter text-foreground">
                      ₹{plan.price}
                    </span>
                    <span className="text-xl text-muted-foreground font-medium">
                      {plan.name === "FREE" ? "" : "/ lifetime"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Watch Time: {plan.time}
                  </p>
                </div>
                <Button
                  size="lg"
                  className={`w-full text-lg h-14 font-bold shadow-lg transition-all transform hover:scale-[1.02] ${user?.plan === plan.name
                    ? "bg-green-600 hover:bg-green-700 cursor-default text-white"
                    : "bg-foreground text-background hover:bg-foreground/90"
                    }`}
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={!!loadingPlan || user?.plan === plan.name}
                >
                  {loadingPlan === plan.name ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5" />
                      Processing...
                    </span>
                  ) : user?.plan === plan.name ? (
                    `Your Plan`
                  ) : plan.name === "FREE" ? (
                    "Current Free Plan"
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
