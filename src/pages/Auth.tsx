import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

const CORRECT_PIN = "1997";

const Auth = () => {
  const [pin, setPin] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already authenticated
    const isAuthenticated = sessionStorage.getItem("isAuthenticated");
    if (isAuthenticated === "true") {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        sessionStorage.setItem("isAuthenticated", "true");
        toast({
          title: "Access Granted",
          description: "Welcome back!",
        });
        navigate("/");
      } else {
        toast({
          title: "Incorrect PIN",
          description: "Please try again",
          variant: "destructive",
        });
        setPin("");
      }
    }
  }, [pin, navigate, toast]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const numbers = [
    { num: "1", letters: "" },
    { num: "2", letters: "ABC" },
    { num: "3", letters: "DEF" },
    { num: "4", letters: "GHI" },
    { num: "5", letters: "JKL" },
    { num: "6", letters: "MNO" },
    { num: "7", letters: "PQRS" },
    { num: "8", letters: "TUV" },
    { num: "9", letters: "WXYZ" },
  ];

  return (
    <div className="min-h-screen bg-dark-gradient flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-12">
        {/* Header */}
        <div className="text-center space-y-8">
          <h1 className="text-2xl font-light text-foreground/90">
            Touch ID or Enter Passcode
          </h1>

          {/* PIN Display */}
          <div className="flex justify-center">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={setPin}
              render={({ slots }) => (
                <InputOTPGroup className="gap-4">
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        slot.char
                          ? "bg-foreground border-foreground"
                          : "border-foreground/30"
                      }`}
                    />
                  ))}
                </InputOTPGroup>
              )}
            />
          </div>
        </div>

        {/* Number Pad */}
        <div className="space-y-4">
          {/* Rows 1-3 */}
          {[0, 3, 6].map(startIdx => (
            <div key={startIdx} className="grid grid-cols-3 gap-6">
              {numbers.slice(startIdx, startIdx + 3).map(({ num, letters }) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="glass-card aspect-square rounded-full flex flex-col items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                >
                  <span className="text-4xl font-light text-foreground">
                    {num}
                  </span>
                  {letters && (
                    <span className="text-xs font-medium text-foreground/60 tracking-wider">
                      {letters}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Bottom Row with 0 */}
          <div className="grid grid-cols-3 gap-6">
            <div /> {/* Empty space */}
            <button
              onClick={() => handleNumberClick("0")}
              className="glass-card aspect-square rounded-full flex flex-col items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
            >
              <span className="text-4xl font-light text-foreground">0</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={pin.length === 0}
              className="aspect-square rounded-full flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all disabled:opacity-0"
            >
              <span className="text-lg font-light text-foreground/80">Delete</span>
            </button>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="flex justify-between text-lg font-light text-foreground/70 px-2">
          <button className="hover:text-foreground/90 transition-colors">
            Emergency
          </button>
          <button className="hover:text-foreground/90 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
