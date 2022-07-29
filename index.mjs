import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
import {ask} from '@reach-sh/stdlib';
if (process.argv.length < 3 || ['Alice', 'Bob'].includes(process.argv[2]) == false) {
  console.log('Usage: reach run index [Alice|Bob]');
  process.exit(0);
}
const who = process.argv[2];
console.log(`Your are ${who}`);
const stdlib = loadStdlib(process.env);
console.log(`The consensus network is ${stdlib.connector}.`);
const suStr = stdlib.standardUnit;
const toAU = (su) => stdlib.parseCurrency(su);
const toSU = (au) => stdlib.formatCurrency(au, 4);
const initialBalanceA = toAU(10000);
const initialBalanceB = toAU(1000);

const showBalance = async (acc) => toSU(await stdlib.balanceOf(acc));

const commonInteract = (who) => ({
  showCountdown: (t) => {
    console.log(`${who} saw countdown time ${t}`);
  },
  informTimeout: () => {
    console.log(`${who} saw timeout`);
  },
  showAcceptance: (amt) => {
   console.log(`Bob accepts the terms of the vault contract for: ${toSU(amt)} ${suStr}`);
  },
  showNotAccepted: () => {
   console.log("Bob does not accept the terms of Alice's Vault contract. You would both exit the contract now! Goodbye...");
  },
  showChoice: (choice) => {
   console.log(`${choice}`);
  },
  showOutcome: (amt, result) => {
    console.log(`${toSU(amt)} ${suStr} has been transfered to ${result ? 'Alice' : 'Bob'}'s Wallet.`);
  },
});

// Alice 
if (who === 'Alice') {
  const aliceInteract = {
    ...commonInteract(who),
    lockedFunds: await ask.ask(
     `please enter the amount of ${suStr}s that you want to lock up in the Vault or press enter the the default ammount of 5000 ${suStr}s:`, (r) => {
      let x = !r ? toAU(5000) : toAU(r);
      if (!r) console.log(toSU(x));
      return x
     }

    ),
    countdown: await ask.ask('How long do you want the funds to be locked up for? Please enter an number or press enter for the default of 10', (x) => {
      let y = !x ? 10 : x;
      if (!x) { console.log(y); }
      return y;
    }),
    deadline: await ask.ask('How long do you want to wait for Bob to accept the terms of the Vault? Please enter an number or press enter for the default of 10', (x) => {
      let y = !x ? 10 : x;
      if (!x) { console.log(y); }
      return y;
    }),
    reportReady: async () => {
      console.log(`Contract info: ${JSON.stringify(await ctc.getInfo())}`);
    },
    getChoice: async () => {
      if (Math.random() <= 0.1) {
        for (let i = 0; i < 10 ; i++) {
          console.log("Alice takes her sweet time...");
          await stdlib.wait(1);
        }
        return {choice:false, report:' '}
      } else {

        const choice = await ask.ask(
        'Hey Alice, Are you there? Please indicate by entering y/n for yes/no respectively.',
        ask.yesno);
        const report = `Alice says ${choice ? "I'm still here!" : "Nah! I've left the building"}.`
        const statement = {choice: choice, report: report}
        return statement;
      }
    }
  };
  const accAlice = await stdlib.newTestAccount(initialBalanceA);
  console.log(`Alice's balance before is: ${await showBalance(accAlice)}`);
  const ctc = accAlice.contract(backend);
  await ctc.participants.Alice(aliceInteract);
  console.log(`Alice's balance after is: ${await showBalance(accAlice)}`);
// Bob
} else {
 const bobInteract = {
  ...commonInteract(who),
  acceptTerms: async (amt, deadline) => {
    if (Math.random() <= 0.1) {
        for (let i = 0; i < 20 ; i++) {
          console.log("Bob takes his sweet time...");
          await stdlib.wait(1);
        }
        return false
      } else {
        const answer = await ask.ask(
        `Hi Bob, Do you accept the terms of Alice's Vault contract for: ${toSU(amt)} ${suStr}? Please indicate by entering y/n for yes/no respectively before the deadline ${deadline} or the contract would exit. Note that if you reject the terms you would exit the contract`,
        ask.yesno
        );
        return answer
      }
    },  
  };

  const accBob = await stdlib.newTestAccount(initialBalanceB);
  const info = await ask.ask('Paste contract info:', (s) => JSON.parse(s));
  const ctc = accBob.contract(backend, info);
  console.log(`Bob's balance before is: ${await showBalance(accBob)}`);
  await ctc.p.Bob(bobInteract);
  console.log(`Bob's balance after is: ${await showBalance(accBob)}`);
};

ask.done();
