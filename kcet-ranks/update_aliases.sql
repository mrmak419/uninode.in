-- 1. Add the new column
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS search_terms TEXT;

-- 2. Populate manual high-quality aliases
UPDATE colleges SET search_terms = 'uvce, uv, university visvesvaraya' WHERE college_code = 'E001';
UPDATE colleges SET search_terms = 'gsksjtie, sksjti' WHERE college_code = 'E002';
UPDATE colleges SET search_terms = 'bmsce, bms, b.m.s.' WHERE college_code = 'E003';
UPDATE colleges SET search_terms = 'dait, dr aait, ambedkar' WHERE college_code = 'E004';
UPDATE colleges SET search_terms = 'rvce, rv, rashtreeya vidyalaya' WHERE college_code = 'E005';
UPDATE colleges SET search_terms = 'msrit, ramaiah, rit, msr' WHERE college_code = 'E006';
UPDATE colleges SET search_terms = 'dsce, dayananda sagar, dsu' WHERE college_code = 'E007';
UPDATE colleges SET search_terms = 'bit, bangalore institute of technology' WHERE college_code = 'E008';
UPDATE colleges SET search_terms = 'pesu, pesit, pes' WHERE college_code = 'E009';
UPDATE colleges SET search_terms = 'mvjce, mvj' WHERE college_code = 'E011';
UPDATE colleges SET search_terms = 'mvit, smvit, sir m. visvesvaraya' WHERE college_code = 'E012';
UPDATE colleges SET search_terms = 'gec, ghousia' WHERE college_code = 'E013';
UPDATE colleges SET search_terms = 'sjcit, sjc' WHERE college_code = 'E014';
UPDATE colleges SET search_terms = 'dttit, kgf' WHERE college_code = 'E015';
UPDATE colleges SET search_terms = 'sit, siddaganga' WHERE college_code = 'E016';
UPDATE colleges SET search_terms = 'ssit, siddhartha' WHERE college_code = 'E017';
UPDATE colleges SET search_terms = 'kit, kalpatharu' WHERE college_code = 'E018';
UPDATE colleges SET search_terms = 'sjce, jss st, jss' WHERE college_code = 'E021';
UPDATE colleges SET search_terms = 'nie, national institute of engineering' WHERE college_code = 'E022';
UPDATE colleges SET search_terms = 'pesce, pes mandya' WHERE college_code = 'E023';
UPDATE colleges SET search_terms = 'mce, malnad' WHERE college_code = 'E024';
UPDATE colleges SET search_terms = 'tce, tontadarya' WHERE college_code = 'E028';
UPDATE colleges SET search_terms = 'mmec, maratha mandal' WHERE college_code = 'E029';
UPDATE colleges SET search_terms = 'bec, basaveshwara' WHERE college_code = 'E031';
UPDATE colleges SET search_terms = 'rec, rte' WHERE college_code = 'E032';
UPDATE colleges SET search_terms = 'stjit, taralabalu' WHERE college_code = 'E033';
UPDATE colleges SET search_terms = 'sdm, sdmce' WHERE college_code = 'E034';
UPDATE colleges SET search_terms = 'aitm, anjuman' WHERE college_code = 'E035';
UPDATE colleges SET search_terms = 'kletech, bvb, b.v.b' WHERE college_code = 'E036';
UPDATE colleges SET search_terms = 'git, gogte, kls' WHERE college_code = 'E037';
UPDATE colleges SET search_terms = 'bldea, hallakatti' WHERE college_code = 'E038';
UPDATE colleges SET search_terms = 'hsit, hira sugar' WHERE college_code = 'E040';
UPDATE colleges SET search_terms = 'pda, p d a' WHERE college_code = 'E041';
UPDATE colleges SET search_terms = 'kbn, khaja bandanawaz' WHERE college_code = 'E042';
UPDATE colleges SET search_terms = 'gndec, gurunanak' WHERE college_code = 'E043';
UPDATE colleges SET search_terms = 'bkit, bheemanna' WHERE college_code = 'E044';
UPDATE colleges SET search_terms = 'rymec, rao bahadur' WHERE college_code = 'E045';
UPDATE colleges SET search_terms = 'hke, sir m v, raichur' WHERE college_code = 'E046';
UPDATE colleges SET search_terms = 'mce, malnad' WHERE college_code = 'E047';
UPDATE colleges SET search_terms = 'bmsce, bms' WHERE college_code = 'E048';
UPDATE colleges SET search_terms = 'bec, basaveshwara' WHERE college_code = 'E049';
UPDATE colleges SET search_terms = 'kvgce, kvg' WHERE college_code = 'E054';
UPDATE colleges SET search_terms = 'pace, p a' WHERE college_code = 'E055';
UPDATE colleges SET search_terms = 'nie, south campus' WHERE college_code = 'E056';
UPDATE colleges SET search_terms = 'jss stu, jss' WHERE college_code = 'E057';
UPDATE colleges SET search_terms = 'pesce, pes mandya' WHERE college_code = 'E058';
UPDATE colleges SET search_terms = 'pda, gulbarga' WHERE college_code = 'E059';
UPDATE colleges SET search_terms = 'dait, dr aait, ambedkar' WHERE college_code = 'E060';
UPDATE colleges SET search_terms = 'ubdtce, bdt' WHERE college_code = 'E061';
UPDATE colleges SET search_terms = 'biet, bapuji' WHERE college_code = 'E062';
UPDATE colleges SET search_terms = 'sjmit, sjm' WHERE college_code = 'E063';
UPDATE colleges SET search_terms = 'ait, adhichunchanagiri' WHERE college_code = 'E064';
UPDATE colleges SET search_terms = 'jnnce, jawaharlal nehru' WHERE college_code = 'E065';
UPDATE colleges SET search_terms = 'ubdtce, ubdt' WHERE college_code = 'E066';
UPDATE colleges SET search_terms = 'bce, bahubali' WHERE college_code = 'E070';
UPDATE colleges SET search_terms = 'vvce, vidya vardhaka' WHERE college_code = 'E071';
UPDATE colleges SET search_terms = 'bitm, ballari' WHERE college_code = 'E075';
UPDATE colleges SET search_terms = 'pdit, proudadevaraya' WHERE college_code = 'E076';
UPDATE colleges SET search_terms = 'vviet, vidya vikas' WHERE college_code = 'E077';
UPDATE colleges SET search_terms = 'toce, oxford' WHERE college_code = 'E078';
UPDATE colleges SET search_terms = 'ait, acharya' WHERE college_code = 'E079';
UPDATE colleges SET search_terms = 'ssse, siddhartha' WHERE college_code = 'E081';
UPDATE colleges SET search_terms = 'jssate, jss' WHERE college_code = 'E082';
UPDATE colleges SET search_terms = 'hkbkce, hkbk' WHERE college_code = 'E083';
UPDATE colleges SET search_terms = 'apsce, aps' WHERE college_code = 'E085';
UPDATE colleges SET search_terms = 'vit, vivekananda' WHERE college_code = 'E087';
UPDATE colleges SET search_terms = 'srsit, sri revana' WHERE college_code = 'E090';
UPDATE colleges SET search_terms = 'ksit, k s' WHERE college_code = 'E091';
UPDATE colleges SET search_terms = 'vemana, vit' WHERE college_code = 'E092';
UPDATE colleges SET search_terms = 'bec, basavakalyana' WHERE college_code = 'E093';
UPDATE colleges SET search_terms = 'cit, coorg' WHERE college_code = 'E094';
UPDATE colleges SET search_terms = 'amc, amcec' WHERE college_code = 'E095';
UPDATE colleges SET search_terms = 'epcet, east point' WHERE college_code = 'E096';
UPDATE colleges SET search_terms = 'cmrit, cmr' WHERE college_code = 'E097';
UPDATE colleges SET search_terms = 'atria, ait' WHERE college_code = 'E098';
UPDATE colleges SET search_terms = 'nhce, new horizon' WHERE college_code = 'E099';
UPDATE colleges SET search_terms = 'knsit, kns' WHERE college_code = 'E100';
UPDATE colleges SET search_terms = 'cit, channabasaveshwara' WHERE college_code = 'E101';
UPDATE colleges SET search_terms = 'dbit, donbosco' WHERE college_code = 'E102';
UPDATE colleges SET search_terms = 'gat, global academy' WHERE college_code = 'E103';
UPDATE colleges SET search_terms = 'ncet, nagarjuna' WHERE college_code = 'E104';
UPDATE colleges SET search_terms = 'ewit, east west' WHERE college_code = 'E106';
UPDATE colleges SET search_terms = 'bnmit, bnm' WHERE college_code = 'E107';
UPDATE colleges SET search_terms = 'sapthagiri, sce' WHERE college_code = 'E108';
UPDATE colleges SET search_terms = 'cec, city' WHERE college_code = 'E109';
UPDATE colleges SET search_terms = 'svce, sri venkateshwara' WHERE college_code = 'E111';
UPDATE colleges SET search_terms = 'skit, sri krishna' WHERE college_code = 'E112';
UPDATE colleges SET search_terms = 'sambhram, sit' WHERE college_code = 'E113';
UPDATE colleges SET search_terms = 'gmit, gm' WHERE college_code = 'E114';
UPDATE colleges SET search_terms = 'sjbit, sjb' WHERE college_code = 'E115';
UPDATE colleges SET search_terms = 'rljit, jalappa' WHERE college_code = 'E116';
UPDATE colleges SET search_terms = 'rnsit, rns' WHERE college_code = 'E118';
UPDATE colleges SET search_terms = 'kct, kctec' WHERE college_code = 'E119';
UPDATE colleges SET search_terms = 'jvit, jnanavikasa' WHERE college_code = 'E120';
UPDATE colleges SET search_terms = 'vcet, vivekananada' WHERE college_code = 'E121';
UPDATE colleges SET search_terms = 'cec, canara' WHERE college_code = 'E123';
UPDATE colleges SET search_terms = 'rgit, rajiv gandhi' WHERE college_code = 'E124';
UPDATE colleges SET search_terms = 'bmsit, bms' WHERE college_code = 'E126';
UPDATE colleges SET search_terms = 'msec, m s engineering' WHERE college_code = 'E127';
UPDATE colleges SET search_terms = 'appa, sharanbasava' WHERE college_code = 'E128';
UPDATE colleges SET search_terms = 'sjec, st joseph' WHERE college_code = 'E129';
UPDATE colleges SET search_terms = 'siet, shridevi' WHERE college_code = 'E130';
UPDATE colleges SET search_terms = 'secab' WHERE college_code = 'E132';
UPDATE colleges SET search_terms = 'gsssietw, gsss' WHERE college_code = 'E133';
UPDATE colleges SET search_terms = 'agadi, sksvm' WHERE college_code = 'E134';
UPDATE colleges SET search_terms = 'kvdit, deshpande' WHERE college_code = 'E135';
UPDATE colleges SET search_terms = 'mit, moodalakatte' WHERE college_code = 'E136';
UPDATE colleges SET search_terms = 'impact' WHERE college_code = 'E139';
UPDATE colleges SET search_terms = 'pesu, pes ec, pes' WHERE college_code = 'E141';
UPDATE colleges SET search_terms = 'bgsit, bgs' WHERE college_code = 'E142';
UPDATE colleges SET search_terms = 'sitm, srinivas' WHERE college_code = 'E144';
UPDATE colleges SET search_terms = 'rrce, rajarajeswari' WHERE college_code = 'E145';
UPDATE colleges SET search_terms = 'shreedevi' WHERE college_code = 'E146';
UPDATE colleges SET search_terms = 'tjit, t john' WHERE college_code = 'E147';
UPDATE colleges SET search_terms = 'citech, cambridge' WHERE college_code = 'E149';
UPDATE colleges SET search_terms = 'pesitm, pes shimoga' WHERE college_code = 'E150';
UPDATE colleges SET search_terms = 'mite, mangalore institute' WHERE college_code = 'E151';
UPDATE colleges SET search_terms = 'sdmit, ujire' WHERE college_code = 'E152';
UPDATE colleges SET search_terms = 'seacet, sea' WHERE college_code = 'E153';
UPDATE colleges SET search_terms = 'gec, government engineering college' WHERE college_name ILIKE 'Government Engineering College%';
UPDATE colleges SET search_terms = 'mitm, maharaja' WHERE college_code = 'E158';
UPDATE colleges SET search_terms = 'kit, karavali' WHERE college_code = 'E159';
UPDATE colleges SET search_terms = 'sahyadri, scem' WHERE college_code = 'E160';
UPDATE colleges SET search_terms = 'yit, yenepoya' WHERE college_code = 'E165';
UPDATE colleges SET search_terms = 'kles, kle' WHERE college_code = 'E167';
UPDATE colleges SET search_terms = 'aiems, amrutha' WHERE college_code = 'E168';
UPDATE colleges SET search_terms = 'aiet, alvas' WHERE college_code = 'E169';
UPDATE colleges SET search_terms = 'brindavan, bce' WHERE college_code = 'E171';
UPDATE colleges SET search_terms = 'rrit, rr' WHERE college_code = 'E172';
UPDATE colleges SET search_terms = 'svit, sai vidya' WHERE college_code = 'E173';
UPDATE colleges SET search_terms = 'ssssmce, shivakumara' WHERE college_code = 'E174';
UPDATE colleges SET search_terms = 'sgbit, balekundri' WHERE college_code = 'E175';
UPDATE colleges SET search_terms = 'nit, navodaya' WHERE college_code = 'E176';
UPDATE colleges SET search_terms = 'rit, rajeev' WHERE college_code = 'E177';
UPDATE colleges SET search_terms = 'nie north, nie' WHERE college_code = 'E178';
UPDATE colleges SET search_terms = 'bit, bearys' WHERE college_code = 'E180';
UPDATE colleges SET search_terms = 'sbit, basaveswara' WHERE college_code = 'E181';
UPDATE colleges SET search_terms = 'cbgit, byre gowda' WHERE college_code = 'E184';
UPDATE colleges SET search_terms = 'aitm, angadi' WHERE college_code = 'E185';
UPDATE colleges SET search_terms = 'acsce, acs' WHERE college_code = 'E186';
UPDATE colleges SET search_terms = 'vvit, vijaya vittala' WHERE college_code = 'E188';
UPDATE colleges SET search_terms = 'navkis, nce' WHERE college_code = 'E189';
UPDATE colleges SET search_terms = 'ait, akshaya' WHERE college_code = 'E191';
UPDATE colleges SET search_terms = 'srinivas' WHERE college_code = 'E193';
UPDATE colleges SET search_terms = 'jce, jain' WHERE college_code = 'E196';
UPDATE colleges SET search_terms = 'vnec, veerappa' WHERE college_code = 'E197';
UPDATE colleges SET search_terms = 'godutai, sharanbasava' WHERE college_code = 'E198';
UPDATE colleges SET search_terms = 'agm, agmrec' WHERE college_code = 'E199';
UPDATE colleges SET search_terms = 'gcem, gopalan' WHERE college_code = 'E201';
UPDATE colleges SET search_terms = 'sampoorna' WHERE college_code = 'E202';
UPDATE colleges SET search_terms = 'kssem, k s' WHERE college_code = 'E203';
UPDATE colleges SET search_terms = 'bti, bangalore technological' WHERE college_code = 'E204';
UPDATE colleges SET search_terms = 'atme' WHERE college_code = 'E205';
UPDATE colleges SET search_terms = 'smvitm, shri madhwa' WHERE college_code = 'E206';
UPDATE colleges SET search_terms = 'vsm, kothiwale' WHERE college_code = 'E207';
UPDATE colleges SET search_terms = 'jit, jyothi' WHERE college_code = 'E209';
UPDATE colleges SET search_terms = 'gmit, g madegowda' WHERE college_code = 'E210';
UPDATE colleges SET search_terms = 'jit, jain' WHERE college_code = 'E211';
UPDATE colleges SET search_terms = 'dsatm, dayananda sagar, dsu' WHERE college_code = 'E212';
UPDATE colleges SET search_terms = 'lec, lingarajappa' WHERE college_code = 'E213';
UPDATE colleges SET search_terms = 'shetty' WHERE college_code = 'E216';
UPDATE colleges SET search_terms = 'alliance' WHERE college_code = 'E220';
UPDATE colleges SET search_terms = 'bgmit, biluru' WHERE college_code = 'E221';
UPDATE colleges SET search_terms = 'citech north, cambridge' WHERE college_code = 'E222';
UPDATE colleges SET search_terms = 'ewce, east west' WHERE college_code = 'E239';
UPDATE colleges SET search_terms = 'dsu, dayananda sagar' WHERE college_code = 'E240';
UPDATE colleges SET search_terms = 'kletech, bvb' WHERE college_code = 'E241';
UPDATE colleges SET search_terms = 'gitam' WHERE college_code = 'E255';
UPDATE colleges SET search_terms = 'rai' WHERE college_code = 'E256';
UPDATE colleges SET search_terms = 'cmr, cmru' WHERE college_code = 'E257';
UPDATE colleges SET search_terms = 'mit, maharaja' WHERE college_code = 'E258';
UPDATE colleges SET search_terms = 'smvsa' WHERE college_code = 'E259';
UPDATE colleges SET search_terms = 'best' WHERE college_code = 'E264';
UPDATE colleges SET search_terms = 'jcet, jain' WHERE college_code = 'E265';
UPDATE colleges SET search_terms = 'bms architecture' WHERE college_code = 'E266';
UPDATE colleges SET search_terms = 'jcer, jain' WHERE college_code = 'E269';
UPDATE colleges SET search_terms = 'rvitm, rvit, rv' WHERE college_code = 'E275';
UPDATE colleges SET search_terms = 'vtu, visvesvaraya' WHERE college_code = 'E278';
UPDATE colleges SET search_terms = 'vtu, visvesvaraya' WHERE college_code = 'E279';
UPDATE colleges SET search_terms = 'rvu, rv university, rv' WHERE college_code = 'E285';
UPDATE colleges SET search_terms = 'bgscet, bgs' WHERE college_code = 'E286';
UPDATE colleges SET search_terms = 'vidyashilp' WHERE college_code = 'E287';
UPDATE colleges SET search_terms = 'garden city' WHERE college_code = 'E288';
UPDATE colleges SET search_terms = 'vtu, visvesvaraya' WHERE college_code = 'E289';
UPDATE colleges SET search_terms = 'vtu, visvesvaraya' WHERE college_code = 'E290';

-- 3. DROP old matrix view
DROP MATERIALIZED VIEW IF EXISTS cutoffs_matrix;

-- 4. Recreate matrix view WITH search_terms and college_name
CREATE MATERIALIZED VIEW cutoffs_matrix AS
SELECT 
  c.college_code, 
  col.college_name,
  col.search_terms,
  c.course_name, 
  c.category, 
  c.seat_type,
  jsonb_object_agg(c.year || '_R' || c.round, c.rank) AS rounds,
  MIN(c.rank) as min_rank,
  MAX(c.rank) as max_rank
FROM cutoffs c
JOIN colleges col ON c.college_code = col.college_code
GROUP BY c.college_code, col.college_name, col.search_terms, c.course_name, c.category, c.seat_type;

-- 5. Restore Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_cutoffs_matrix_unique 
  ON cutoffs_matrix (college_code, course_name, category, seat_type);

CREATE INDEX IF NOT EXISTS idx_cutoffs_matrix_search 
  ON cutoffs_matrix (category, seat_type, max_rank, min_rank);

GRANT SELECT ON cutoffs_matrix TO public;
