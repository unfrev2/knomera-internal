-- Generated from src/lib/seed/assumptions.ts
-- Idempotent: upserts workspace and assumptions by seed_key.

INSERT INTO workspaces (name, slug)
VALUES ('Knomera', 'knomera')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a001',
  'Mature experimentation teams struggle to know their true testing capacity.',
  'Problem & Market',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Interview 10 to 15 experimentation leads and ask how they currently determine available testing capacity.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a002',
  'Experiment roadmaps regularly contain more tests than available traffic can support.',
  'Problem & Market',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Obtain real experiment roadmaps and compare planned experiments, available traffic and historical throughput.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a003',
  'Teams struggle to predict how long planned experiments will take.',
  'Problem & Market',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare planned test duration with actual duration across historical experiment programmes.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a004',
  'Test duration is usually considered too late in planning.',
  'Problem & Market',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Ask experimentation teams when sample size and expected duration first enter their planning process.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a005',
  'Organisations optimise individual experiments but rarely optimise the overall experimentation portfolio.',
  'Problem & Market',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Map how mature experimentation programmes allocate traffic and prioritise competing experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a006',
  'Parallel experimentation creates uncertainty about interaction and pollution risk.',
  'Problem & Market',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Ask experimentation teams to explain their rules for allowing simultaneous experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a007',
  'Fear of interaction causes some organisations to test unnecessarily sequentially.',
  'Problem & Market',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Collect examples where experiments were delayed solely because another experiment was running.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a008',
  'Some organisations run experiments simultaneously without properly understanding interaction risk.',
  'Problem & Market',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Review real experiment calendars and ask teams how interaction risk was assessed.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a009',
  'Experiment capacity is a meaningful business constraint, not merely a CRO inconvenience.',
  'Problem & Market',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Quantify delayed experiments and estimate the commercial opportunity cost created by capacity constraints.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a010',
  'Experimentation planning becomes materially harder as organisations add web, app, checkout and server-side testing.',
  'Problem & Market',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare planning processes between single-platform and multi-platform experimentation teams.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a011',
  'Experiment knowledge is fragmented across tools, decks, spreadsheets and people''s heads.',
  'Problem & Market',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Ask teams to locate and explain the result and learning from a randomly selected experiment more than 12 months old.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a012',
  'Organisations repeatedly test questions they have effectively answered before.',
  'Problem & Market',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Review historical experiment libraries for repeated hypotheses or substantially similar questions.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a013',
  'Experiment results are poorly connected to subsequent product decisions.',
  'Problem & Market',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Trace product decisions backwards to the experimentation evidence that informed them.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a014',
  'Experimentation platforms understand experiments but not enough of the customer''s wider business context.',
  'Problem & Market',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare major experimentation-platform data models with the contextual information required for portfolio-level planning.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a015',
  'Existing experimentation platforms are unlikely to solve the whole orchestration problem themselves.',
  'Problem & Market',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Track competitor capabilities and roadmaps and test this belief during customer interviews.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a016',
  'Heads of Experimentation and CRO are likely to be the initial internal champions for Knomera.',
  'Customer',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Conduct founder-led outreach and track which roles engage most strongly with the proposition.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a017',
  'The economic buyer may sit above the experimentation team.',
  'Customer',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Track champion, decision-maker, budget holder and procurement involvement during early sales conversations.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a018',
  'Product leaders also care about experimentation capacity.',
  'Customer',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Interview Heads and VPs of Product separately from experimentation specialists.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a019',
  'Companies with multiple experimentation teams feel the problem more strongly.',
  'Customer',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare reported pain and planning complexity by number of teams running experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a020',
  'Companies running 50 or more experiments per year are substantially better initial prospects than low-volume programmes.',
  'Customer',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Segment discovery conversations by annual experiment volume and compare problem severity and willingness to pay.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a021',
  'Companies using multiple experimentation platforms are particularly attractive customers.',
  'Customer',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare pain, fragmentation and willingness to pay between single-platform and multi-platform organisations.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a022',
  'Organisations without an established experimentation programme are poor initial Knomera customers.',
  'Customer',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Test the proposition with lower-maturity organisations and compare perceived value.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a023',
  'Enterprise experimentation teams will accept another tool if it sits above rather than replaces their existing stack.',
  'Customer',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Show prospective customers the proposed architecture and explicitly test resistance to adding another platform.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a024',
  'Customers want recommendations rather than another dashboard.',
  'Customer',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare customer reactions to dashboard-led and recommendation-led prototypes.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a025',
  'Teams will trust Knomera to recommend when experiments should run.',
  'Customer',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Produce scheduling recommendations for real experiment roadmaps and compare them with expert human decisions.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a026',
  'Teams will eventually allow Knomera to automatically schedule experiments.',
  'Customer',
  'medium'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'First validate willingness to use recommendations, then test appetite for increasing levels of automation.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a027',
  'Experimentation leaders can justify Knomera''s cost through increased experimentation throughput and value.',
  'Customer',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Build ROI models using real customer experiment volumes, delays and historical experiment value.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a028',
  'Traffic can be modelled as a finite experimentation resource.',
  'Capacity Engine',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Build a capacity model using real traffic distributions and historical experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a029',
  'Sample-size requirements can be estimated accurately enough for planning purposes.',
  'Capacity Engine',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Back-test predicted sample requirements and durations against completed experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a030',
  'Historical effect sizes can help suggest realistic MDEs for future experiments.',
  'Capacity Engine',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Analyse historical experiment effect-size distributions by experiment type and business area.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a031',
  'Using a blanket MDE across every experiment produces poor capacity estimates.',
  'Capacity Engine',
  'medium'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare capacity forecasts using fixed MDEs with forecasts using context-specific MDE assumptions.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a032',
  'Experiment duration estimates do not need to be exact to be operationally useful.',
  'Capacity Engine',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Give experimentation managers duration ranges and test whether they are sufficient for roadmap planning.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a033',
  'Seasonality materially affects future experiment duration.',
  'Capacity Engine',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Back-test duration forecasts across high and low traffic periods.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a034',
  'Conversion rate alone is insufficient for estimating experiment capacity.',
  'Capacity Engine',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Model the contribution of traffic, allocation, baseline rate, MDE and metric variance to duration.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a035',
  'Experiment capacity can be calculated at individual surfaces and audiences rather than only at total website level.',
  'Capacity Engine',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Build a prototype traffic topology for a real digital product.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a036',
  'Available traffic can be automatically matched to candidate experiments.',
  'Capacity Engine',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Build a prototype matching algorithm using a real experiment roadmap and traffic topology.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a037',
  'Knomera can identify unused capacity where smaller experiments could run.',
  'Capacity Engine',
  'medium'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Back-test gap identification against historical experiment calendars.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a038',
  'Capacity planning can meaningfully increase the number of valid experiments completed per year.',
  'Capacity Engine',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Simulate historical programmes with and without capacity optimisation, then validate through a customer pilot.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a039',
  'Two experiments sharing a page do not automatically need to be mutually exclusive.',
  'Experiment Interaction',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Validate against statistical literature, practitioner experience and historical parallel experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a040',
  'Experiment interaction risk can be represented using understandable dimensions.',
  'Experiment Interaction',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Validate pollution-matrix dimensions with experienced experimentation practitioners.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a041',
  'Audience overlap is only one component of experiment interaction risk.',
  'Experiment Interaction',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Review interaction examples and identify factors associated with meaningful interference.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a042',
  'Shared metrics increase the potential cost of experiment interaction.',
  'Experiment Interaction',
  'medium'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Model and review historical examples where parallel tests affect the same primary or secondary metrics.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a043',
  'UI proximity can be used as one signal of interaction likelihood.',
  'Experiment Interaction',
  'medium'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Back-test proximity scoring against known experiment interactions.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a044',
  'Experiment hypotheses can be used to infer interaction risk.',
  'Experiment Interaction',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Compare hypothesis-based interaction predictions against expert human assessments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a045',
  'A useful pollution score can be generated without observing actual experiment outcomes.',
  'Experiment Interaction',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Blind-test pollution scores against practitioner assessments of real experiment pairs.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a046',
  'Teams would run more experiments in parallel if given defensible interaction-risk guidance.',
  'Experiment Interaction',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Measure planned parallelism before and after introducing risk guidance in a pilot programme.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a047',
  'Knomera should recommend mitigation rather than simply classifying experiment combinations as safe or unsafe.',
  'Experiment Interaction',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Prototype both approaches and test which better supports practitioner decisions.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a048',
  'Some experiment interaction risk is worth accepting because increased throughput can outweigh the statistical risk.',
  'Experiment Interaction',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Build example decision models and validate the trade-off with experienced practitioners.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a049',
  'Experiment roadmaps can be represented as a constraint optimisation problem.',
  'Scheduling',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Build a solver prototype using a real experiment roadmap, traffic constraints and dependencies.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a050',
  'Planned experiments contain enough predictable attributes to schedule algorithmically.',
  'Scheduling',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Import several real roadmaps and assess whether required scheduling attributes are available or inferable.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a051',
  'Business priority should influence experimentation traffic allocation.',
  'Scheduling',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Validate prioritisation inputs with experimentation and product leaders.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a052',
  'Experiments need deadlines or scheduling windows as well as priority.',
  'Scheduling',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Analyse real roadmaps for launch dependencies, seasonal windows and deadlines.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a053',
  'Knomera can suggest a materially better experiment schedule than manual planning.',
  'Scheduling',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Blind-compare Knomera-generated schedules with schedules produced by experienced experimentation leaders.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a054',
  'Re-planning when experiments finish earlier or later than expected provides meaningful value.',
  'Scheduling',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Simulate dynamic re-planning against historical experiment completion dates.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a055',
  'Teams will allow software to recommend moving experiment roadmap items.',
  'Scheduling',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Present recommendation-based roadmap changes to practitioners and observe acceptance or override behaviour.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a056',
  '"What should we run next?" is ultimately more valuable than simply answering "when will this experiment finish?"',
  'Scheduling',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Test both propositions separately in customer discovery and prototype sessions.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a057',
  'Experiment results become significantly less discoverable over time.',
  'Knowledge',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Run retrieval exercises across historical experiment repositories.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a058',
  'Existing experiment repositories capture results better than reusable learnings.',
  'Knowledge',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Audit experiment documentation and distinguish stored results from reusable knowledge.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a059',
  'A reusable learning should be represented separately from an individual experiment result.',
  'Knowledge',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Model historical experiments into separate experiment, result and learning objects and test usability.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a060',
  'Multiple experiments can contribute evidence towards one business belief.',
  'Knowledge',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Model a real historical experimentation programme as beliefs supported by multiple experiments.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a061',
  'Knomera can build an evolving representation of what a company knows.',
  'Knowledge',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Prototype a knowledge model using historical experimentation data from a real organisation.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a062',
  'Historical knowledge should influence future experiment prioritisation.',
  'Knowledge',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare prioritisation decisions with and without access to structured historical learning.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a063',
  'AI can extract useful structured learnings from existing experiment documentation.',
  'Knowledge',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Benchmark AI extraction against expert human labelling of historical experiment documentation.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a064',
  'Teams will permit Knomera to ingest historical experiment documentation.',
  'Knowledge',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Explore security, privacy and procurement requirements during customer discovery.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a065',
  'Knomera''s knowledge asset becomes more valuable as the platform is used for longer.',
  'Knowledge',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Define measurable indicators of knowledge reuse and test longitudinally with early customers.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a066',
  'Accumulated company knowledge can create meaningful switching costs.',
  'Knowledge',
  'high'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Revisit after longitudinal customer usage exists and test whether accumulated knowledge affects retention.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a067',
  'LLMs can understand experiment hypotheses sufficiently well for useful classification.',
  'AI',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Benchmark LLM classification against expert-labelled experiment hypotheses.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a068',
  'AI can map experiments to business areas automatically.',
  'AI',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Create a labelled historical dataset and measure classification accuracy.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a069',
  'AI can identify semantically related historical experiments.',
  'AI',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Build a retrieval benchmark using known related and unrelated experiment pairs.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a070',
  'AI-generated experiment ideas alone are not differentiated enough to build Knomera around.',
  'AI',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Track competitor capabilities and test customer willingness to pay specifically for idea generation.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a071',
  'Business context makes AI experimentation recommendations materially better.',
  'AI',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Compare generic recommendations with recommendations generated using structured company context.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a072',
  'Customers will tolerate occasional imperfect recommendations if Knomera explains its reasoning.',
  'AI',
  'high'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Test transparent and opaque recommendations with practitioners and measure trust and acceptance.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a073',
  'Recommendations need supporting evidence rather than unexplained AI output.',
  'AI',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare practitioner responses to recommendations with and without supporting evidence.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a074',
  'Human override will remain important for high-impact experimentation planning decisions.',
  'AI',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Validate desired automation boundaries during prototype testing.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a075',
  'Knomera''s defensible asset is the business model and data layer rather than the underlying LLM.',
  'AI',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Continue competitor and architecture analysis while testing whether accumulated context improves product value.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a076',
  'Knomera should sit above experimentation platforms rather than replace them.',
  'Product & Integration',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Test this positioning explicitly in customer interviews and sales conversations.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a077',
  'Customers will connect their existing experimentation platforms to Knomera.',
  'Product & Integration',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Ask design partners to authorise a real integration or provide equivalent exported data.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a078',
  'Initial customer value can be delivered before deep platform integrations exist.',
  'Product & Integration',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Attempt to deliver and sell a concierge or manually imported MVP.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a079',
  'CSV or manual import is acceptable for an early Knomera pilot.',
  'Product & Integration',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Run an early pilot using manual or CSV ingestion and measure friction.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a080',
  'Automatic traffic and analytics ingestion will eventually be required.',
  'Product & Integration',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Observe data-maintenance effort and failure points during early pilots.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a081',
  'Analytics platforms contain enough traffic information for much of the capacity model.',
  'Product & Integration',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Build a technical spike using real analytics exports or APIs.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a082',
  'Experimentation platforms contain enough metadata to bootstrap Knomera''s experiment model.',
  'Product & Integration',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Review APIs and exports from major experimentation platforms against Knomera''s required fields.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a083',
  'Project-management integrations become useful once scheduling is established.',
  'Product & Integration',
  'medium'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Map customer roadmap workflows and identify where Jira, Linear or similar systems become necessary.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a084',
  'Customers do not want to manually maintain another experiment repository.',
  'Product & Integration',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Observe willingness to maintain duplicated experiment records during prototype and pilot use.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a085',
  'Knomera needs to fit existing experimentation workflows rather than require customers to adopt an entirely new process.',
  'Product & Integration',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Map existing workflows before designing integration and onboarding requirements.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a086',
  'Companies will pay specifically for experimentation intelligence and orchestration.',
  'Commercial',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Put a priced Knomera proposition in front of qualified prospective customers and ask for the sale.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a087',
  'Knomera can deliver enough value to charge customers before becoming a fully automated SaaS product.',
  'Commercial',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Attempt to sell a concierge or design-partner engagement before full product automation exists.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a088',
  'A paid pilot is preferable to a free design partnership for validating commercial demand.',
  'Commercial',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Test paid and free design-partner propositions and compare engagement and conversion.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a089',
  'Knomera can demonstrate financial value through increased experimentation throughput.',
  'Commercial',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Build ROI models using customer traffic, throughput, delay and experiment-value data.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a090',
  'Preventing poor or low-value experiments creates measurable customer value.',
  'Commercial',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Quantify the traffic, time and opportunity cost consumed by experiments that should not have run.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a091',
  'Enterprise pricing can be materially higher than conventional CRO tooling add-ons.',
  'Commercial',
  'high'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Test pricing ranges in customer conversations and through real commercial proposals.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a092',
  'Per-seat pricing would align poorly with Knomera''s customer value.',
  'Commercial',
  'medium'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Compare customer reactions and economics across seat-based and value/scale-based pricing models.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a093',
  'Pricing based on experimentation scale or capability may align better with customer value.',
  'Commercial',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Test packaging based on experiment volume, traffic, business units or capability level.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a094',
  'A £10,000 to £30,000 initial engagement is plausible before Knomera has a mature SaaS product.',
  'Commercial',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Put proposals within this range in front of qualified prospects and record the response.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a095',
  'Consulting can fund product development without Knomera becoming primarily a consultancy.',
  'Commercial',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Track service hours, gross margin, reusable product development and revenue across initial engagements.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a096',
  'Founder expertise materially increases early Knomera sales credibility.',
  'Commercial',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Track customer engagement and conversion during founder-led discovery and sales.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a097',
  'Knomera can eventually sell independently of founder reputation.',
  'Commercial',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Test non-founder-led acquisition and sales once a repeatable proposition has been established.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a098',
  'Major experimentation vendors will continue adding AI capabilities.',
  'Competitive',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Review major competitor product announcements and roadmaps quarterly.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a099',
  'Generic AI experiment generation will rapidly commoditise.',
  'Competitive',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Track feature convergence across experimentation, analytics and general AI products.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a100',
  'Existing experimentation vendors have an advantage because they already possess customer experiment data.',
  'Competitive',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Analyse competitor access to experiment history, results, audiences and traffic data.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a101',
  'Existing vendors are disadvantaged because they primarily understand experiments inside their own platform rather than the customer''s complete business context.',
  'Competitive',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Compare competitor data models and integrations with the wider context required by Knomera''s proposed recommendations.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a102',
  'Cross-platform neutrality can be a meaningful Knomera advantage.',
  'Competitive',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Test the proposition specifically with organisations operating multiple experimentation platforms.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a103',
  'Customers value an independent experimentation intelligence layer across their stack.',
  'Competitive',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Test willingness to adopt and pay for an independent layer rather than relying on existing vendors.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a104',
  'Knomera''s moat cannot simply be better AI.',
  'Competitive',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Continue evaluating differentiation against improving foundation models and competitor AI capabilities.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a105',
  'The combination of business topology, experiment history, constraints and accumulated learnings could become a defensible Knomera asset.',
  'Competitive',
  'critical'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Test whether recommendations measurably improve as increasingly rich company context is accumulated.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a106',
  'Jon and Ahmed can build a credible Knomera MVP without external engineering hires.',
  'Founder & Execution',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Deliver the first usable MVP and track where capability or capacity gaps emerge.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a107',
  'Founder experimentation expertise compensates for initially limited product breadth.',
  'Founder & Execution',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Test customer response to a narrow product combined with expert founder-led onboarding and interpretation.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a108',
  'Three months is enough to reach something demonstrable to prospective customers.',
  'Founder & Execution',
  'high'::importance_level,
  'medium'::confidence_level,
  'untested',
  NULL,
  'Define the three-month demonstration milestone and track actual delivery against it.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a109',
  'A first commercial contract could cover Ahmed''s subsequent development costs.',
  'Founder & Execution',
  'critical'::importance_level,
  'low'::confidence_level,
  'untested',
  NULL,
  'Define the required contract value and build a qualified pipeline capable of producing it.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a110',
  'Building substantial product functionality before customer discovery creates a significant risk of wasted development.',
  'Founder & Execution',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Require major roadmap items to link to a validated customer problem or explicit assumption being tested.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a111',
  'Founder access to senior experimentation practitioners provides Knomera with a strong initial discovery channel.',
  'Founder & Execution',
  'high'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Secure the first 10 to 15 structured discovery conversations through the founders'' existing networks.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;

INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  (SELECT id FROM workspaces WHERE slug = 'knomera'),
  'a112',
  'Experience from individual companies provides useful problem insight but creates a risk of overfitting Knomera to one sophisticated experimentation organisation.',
  'Founder & Execution',
  'critical'::importance_level,
  'high'::confidence_level,
  'untested',
  NULL,
  'Validate every foundational problem across multiple unrelated organisations, industries and experimentation setups.',
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;
