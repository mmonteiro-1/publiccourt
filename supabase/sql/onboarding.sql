-- ONBOARDING: EIGHT TAP-ONLY QUESTIONS, THEN THE NAME, SAVED AT EVERY STEP. RUN IN THE SUPABASE SQL EDITOR; THIS FILE IS THE
-- RECORD OF WHAT'S LIVE. SAFE TO RUN AGAIN

-- THE FIRST ANSWER CREATES THE ROW, BEFORE THE NAME (THE LAST STEP)
alter table public.profiles alter column name drop not null;

-- SHORT CODES, NEVER THE COPY, SO THE WORDING CAN CHANGE. NULL UNTIL ANSWERED
-- Há quanto tempo jogas ténis? — Há 1 mês · Há 1 ano · Há 10 anos
alter table public.profiles add column if not exists playing_since text
	check (playing_since in ('1m', '1y', '10y'));
-- De 0 a 100, quão profissional és? — Sei segurar a raquete · Devolvo quase todas as bolas · Treino o serviço sozinho aos domingos
-- ALSO THE SKILL SIGNAL PARTNERS AND MATCHMAKING NEED
alter table public.profiles add column if not exists ability text
	check (ability in ('beginner', 'intermediate', 'advanced'));
-- Quantas vezes jogas no verão? — Só quando os primos de França vêm de férias · Quando me lembro de praticar exercício ·
-- Mais vezes do que vejo a família
alter table public.profiles add column if not exists summer_play text
	check (summer_play in ('rare', 'often', 'always'));
-- Quando dás de cara com um campo ocupado — Deixo para a próxima e vou aos copos · Pergunto aos jogadores se ainda
-- demoram · Vou logo tentar a sorte noutro campo
alter table public.profiles add column if not exists court_taken text
	check (court_taken in ('give_up', 'ask', 'elsewhere'));
-- Os teus jogos costumam ser competitivos? — Jogo mais para praticar exercício · Não conto pontuação, mas levo a sério ·
-- Vou até ao tie-break se precisar
alter table public.profiles add column if not exists competitiveness text
	check (competitiveness in ('exercise', 'serious', 'competitive'));
-- Já pagaste por aulas ou para jogar? — Tenho mais que fazer, pá · Até pagava, se calhar · Pago com gosto
-- ALSO A SIGNAL FOR PRIVATE COURTS AND THE PAID ADD-ONS
alter table public.profiles add column if not exists pays_to_play text
	check (pays_to_play in ('no', 'maybe', 'yes'));
-- Com quantos jogadores diferentes costumas jogar? — 1: nem conheço outros jogadores · 2 ou 3: tenho um backup ou outro ·
-- Nem sei dizer, são muitos. A FIRST HINT AT PARTNERS, BEFORE THE APP RECORDS THEM
alter table public.profiles add column if not exists partner_count text
	check (partner_count in ('one', 'few', 'many'));
-- Como descobriste o Campo Livre? — Esbarrei com o QR Code no campo · Um amigo obrigou-me · Na rede mundial de computadores.
-- WHICH CHANNEL BRINGS PLAYERS IN: THE QR STICKERS, WORD OF MOUTH OR SEARCH
alter table public.profiles add column if not exists found_via text
	check (found_via in ('qr', 'friend', 'web'));

-- NULL UNTIL THE LAST STEP: TELLS A FINISHED PLAYER FROM ONE WHO LEFT HALFWAY, WHOM THE ROUTER (profile.js) SENDS BACK
alter table public.profiles add column if not exists onboarded_at timestamptz;

-- EVERY PLAYER FROM BEFORE THIS ONBOARDING FINISHED THE OLD ONE, SO NOBODY IS SENT BACK. ONLY NAMED ROWS: A HALFWAY PLAYER
-- HAS NO NAME YET, SO RUNNING THIS AGAIN LATER NEVER MARKS ONE AS FINISHED
update public.profiles set onboarded_at = created_at
where onboarded_at is null and name is not null;
