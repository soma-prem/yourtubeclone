import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "./ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useUser } from "@/lib/AuthContext";

const OtpDialog = () => {
  const { otpFlow, otpLoading, submitPhone, verifyOtp, resendOtp, closeOtp } = useUser();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const isPhoneStep = otpFlow?.step === "phone";

  const handleSubmit = async () => {
    if (isPhoneStep) {
      await submitPhone(phone);
      setPhone("");
    } else {
      await verifyOtp(code);
      setCode("");
    }
  };

  return (
    <Dialog open={!!otpFlow?.isOpen} onOpenChange={closeOtp}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPhoneStep ? "Add Phone Number" : "Verify OTP"}
          </DialogTitle>
        </DialogHeader>

        {isPhoneStep ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your mobile number (E.164 format recommended, e.g. +919876543210).
            </p>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit OTP sent to {otpFlow?.target || "your device"}.
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Didn't receive the code?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resendOtp}
                disabled={otpLoading}
              >
                Resend OTP
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={closeOtp} disabled={otpLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={otpLoading}>
            {otpLoading ? "Processing..." : isPhoneStep ? "Send OTP" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OtpDialog;
