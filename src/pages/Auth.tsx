import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [pin, setPin] = useState("");
  const [correctPin, setCorrectPin] = useState("1997");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Fetch the correct PIN from settings
    const fetchPin = async () => {
      const { data } = await supabase
        .from("settings")
        .select("admin_pin")
        .single();
      
      if (data?.admin_pin) {
        setCorrectPin(data.admin_pin);
      }
    };

    fetchPin();

    // Check if already authenticated
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (isAuthenticated === "true") {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        localStorage.setItem("isAuthenticated", "true");
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
  }, [pin, correctPin, navigate, toast]);

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

      </div>
    </div>
  );
};

export default Auth;
