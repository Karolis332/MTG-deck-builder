const fs=require('node:fs');
const repo='C:/Users/QuLeR/black-grimoire-web';
fs.mkdirSync(repo+'/src/app/fx-check',{recursive:true});
fs.writeFileSync(repo+'/src/app/fx-check/page.tsx',`import { SiteHeaderContent } from '@/components/site-header';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
export default async function Fixture({searchParams}:{searchParams:Promise<{state?:string}>}) {
  const {state}=await searchParams;
  return <div><SiteHeaderContent showDashboard={state==='signed-in'} accountAction={<Link href="/sign-in" className={buttonVariants({variant:'outline',size:'sm'})}>Sign in</Link>} /><div className="py-16 px-6"><h1>Header verification</h1></div></div>;
}`);
const dashboard=fs.readFileSync(repo+'/src/app/dashboard/page.tsx','utf8');
const body=dashboard.slice(dashboard.indexOf('  return (\n    <div className="max-w-5xl'));
fs.mkdirSync(repo+'/src/app/dashboard/fx-check',{recursive:true});
fs.writeFileSync(repo+'/src/app/dashboard/fx-check/page.tsx',`import Link from 'next/link';
import {buttonVariants} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Plus,Swords} from 'lucide-react';
import {cn} from '@/lib/utils';
export default function DashboardFixture(){
const plan={maxDecks:10,priceId:null,name:'Free'}; const atLimit=false;
const userDecks=${JSON.stringify(Array.from({length:6},(_,i)=>({id:i+1,name:['Judith’s book of ashes','Y’shtola, Night’s Blessed','The Emperor of Palamecia','The Ur-Dragon','Sauron, the Dark Lord','Witherbloom, the Balancer'][i],format:'commander',commanderName:['Judith, the Scourge Diva',"Y’shtola, Night’s Blessed",'The Emperor of Palamecia','The Ur-Dragon','Sauron, the Dark Lord','Witherbloom, the Balancer'][i],cardCount:100,strategy:'Sacrifice and recursion',colors:['B','R']})))};
${body}`);
const matches=fs.readFileSync(repo+'/src/app/dashboard/matches/page.tsx','utf8');
const matchBody=matches.slice(matches.indexOf('  return (\n    <div className="max-w-5xl'));
const tile=matches.slice(matches.indexOf('function StatTile'),matches.indexOf('export default'));
fs.mkdirSync(repo+'/src/app/dashboard/fx-matches',{recursive:true});
fs.writeFileSync(repo+'/src/app/dashboard/fx-matches/page.tsx',`import Link from 'next/link';
import {ConnectDesktop} from '@/components/dashboard/connect-desktop';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Tally} from '@/components/tome/tally';
import {formatRelativeDate} from '@/lib/utils';
import {Trophy} from 'lucide-react';
${tile}
export default function MatchFixture(){
const totals={games:36,wins:20,losses:15,draws:1,winRate:20/36};
const activeToken:{lastUsedAt:Date|null}|null=null;
const matches=Array.from({length:8},(_,i)=>({id:i,playedAt:new Date('2026-09-20T08:00:00Z'),format:'commander',deckName:'The Emperor of Palamecia: '+ 'Sacrifice'.repeat(10),opponentName:'Opponent#12345',result:i%2?'loss':'win',turns:8+i}));
${matchBody.replace('activeToken?.lastUsedAt ? activeToken.lastUsedAt.toISOString() : null','null')}`);
