import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PendingQuestionCard({
 questionId,
 questionText,
 partnerName,
 cycleNumber = 1,
 questionNumberInCycle = 1,
 questionsPerCycle = 5,
}: {
 questionId: string;
 questionText: string;
 partnerName?: string;
 cycleNumber?: number;
 questionNumberInCycle?: number;
 questionsPerCycle?: number;
}) {
 const questionsRemaining = questionsPerCycle - questionNumberInCycle;

 return (
 <Card className="border-primary/30 bg-primary/5 ring-1 ring-primary/20 animate-pulse-soft">
 <CardHeader className="pb-2">
 <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-primary">
 <span className="flex items-center gap-2">
 <MessageSquare className="h-4 w-4" />
 Your turn - answer this question
 </span>
 <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium">
 Cycle {cycleNumber} · Question {questionNumberInCycle}
 </span>
 </CardDescription>
 <CardTitle className="font-serif text-xl leading-snug">{questionText}</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="mb-2 text-sm text-muted-foreground">
 {partnerName
 ? `Your answer helps ${partnerName} understand you through guided reflection.`
 : "Thoughtful answers fuel your shared healing loop."}
 </p>
 <p className="mb-4 text-xs text-muted-foreground">
 {questionsRemaining > 0
 ? `${questionsRemaining} more of your reflection${questionsRemaining === 1 ? "" : "s"} this cycle - both partners need 5 each`
 : "This completes your 5 reflections - waiting for your partner if they haven't finished"}
 </p>
 <Button asChild className="w-full sm:w-auto">
 <Link href={`/question/${questionId}`}>
 Answer now
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </CardContent>
 </Card>
 );
}
