
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Volume2, Loader2, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [ipaInput, setIpaInput] = useState("");
  const [simulationResult, setSimulationResult] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [theme, setTheme] = useState("dark");
  const { toast } = useToast();

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = ipaInput.trim();

    if (!trimmedInput) {
      toast({
        variant: "destructive",
        title: "Input required",
        description: "Please enter an IPA string to simulate audio.",
      });
      return;
    }

    setIsSimulating(true);
    setSimulationResult("");

    setTimeout(() => {
      setSimulationResult(`Audio generated for: ${trimmedInput}`);
      setIsSimulating(false);
    }, 1000);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <Button onClick={toggleTheme} variant="ghost" size="icon">
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            IPA Phonotype
          </CardTitle>
          <CardDescription className="pt-2">
            Enter an International Phonetic Alphabet (IPA) string below and
            click the button to simulate audio generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="ipa-input"
                placeholder="e.g., /əˈkustɪk/"
                type="text"
                value={ipaInput}
                onChange={(e) => setIpaInput(e.target.value)}
                disabled={isSimulating}
                className="text-center text-lg h-12"
                aria-label="IPA Input"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-bold text-base bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isSimulating}
            >
              {isSimulating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Volume2 className="mr-2 h-5 w-5" />
              )}
              {isSimulating ? "Generating..." : "Simulate Audio"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="h-10 justify-center items-center">
          {simulationResult && (
            <p
              className="text-sm text-muted-foreground animate-in fade-in-0 duration-500"
              aria-live="polite"
            >
              {simulationResult}
            </p>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
