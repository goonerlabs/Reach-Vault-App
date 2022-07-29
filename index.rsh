'reach 0.1';

const commonInteract = {
 showCountdown: Fun([UInt], Null),
 informTimeout: Fun([], Null),
 showAcceptance: Fun([UInt], Null),
 showChoice: Fun([Bytes(48)], Null),
 showNotAccepted: Fun([], Null),
 showOutcome: Fun([UInt, Bool], Null),
};

const aliceInteract = {
 ...commonInteract,
 lockedFunds: UInt,
 countdown: UInt,
 deadline: UInt,
 reportReady: Fun([], Null),
 getChoice: Fun([], Object({
 choice: Bool,
 report: Bytes(48)
 })),
};

const bobInteract = {
 ...commonInteract,
 acceptTerms: Fun([UInt, UInt], Bool),
};

export const main = Reach.App(() => {
 const Alice = Participant('Alice', aliceInteract);
 const Bob = Participant('Bob', bobInteract);
 init();

 const informTimeout = () => {
  each([Alice, Bob], () => {
   interact.informTimeout();
  });
 };

 const showNotAccepted = () => {
  each([Alice, Bob], () => {
   interact.showNotAccepted()
  });
 };

 Alice.only(() => {
  const ammount = declassify(interact.lockedFunds);
  const deadline = declassify(interact.deadline);
  const countdown = declassify(interact.countdown);
 });
 Alice.publish(ammount, deadline, countdown)
 .pay(ammount);
 Alice.interact.reportReady();
 commit();

 Bob.only(() => {
  const answer = declassify(interact.acceptTerms(ammount, deadline));
 });
 Bob.publish(answer).timeout(relativeTime(deadline), 
 () => closeTo(Alice, informTimeout));

 if (!answer) {
  commit();
  each([Alice, Bob], () => interact.showNotAccepted());
  closeTo(Alice, showNotAccepted)
 } 


 each([Alice, Bob], () => {
  interact.showCountdown(countdown);
  interact.showAcceptance(ammount);
 });




 const countdownEnd = lastConsensusTime() + countdown;
 var [isAliceHere, counter] = [true, 0];
 invariant(balance() == ammount);
 while (lastConsensusTime() <= countdownEnd && isAliceHere && counter <= 5) {
  commit();

  Alice.only(() => {
   const response = declassify(interact.getChoice());
  });
  Alice.publish(response).timeout(relativeTime(countdownEnd), () => closeTo(Bob, informTimeout));
  
  each([Alice, Bob], () => {
   interact.showChoice(response.report);
  });

  
  [isAliceHere, counter] = [response.choice, (counter + 1)];
  continue;

 }
 
 isAliceHere ? transfer(ammount).to(Alice) : transfer(ammount).to(Bob);

 each([Alice, Bob], () => {
  interact.showOutcome(ammount, isAliceHere);
 });


 commit();
 exit();
})