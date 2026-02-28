# Neo4j Setup

## Provisioning

1. Create a free instance at [Neo4j Aura](https://console.neo4j.io/)
2. Select **AuraDB Free** (200K nodes, 400K relationships)
3. Save the connection credentials
4. Copy `.env.local.example` to `.env.local` and fill in `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`

## Applying Schema Constraints

Run `constraints.cypher` against your instance. Options:

**Neo4j Browser** (easiest): Paste each statement individually into the query box.

**cypher-shell**:
```bash
cat db/constraints.cypher | cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD
```

## Verifying

```cypher
SHOW CONSTRAINTS;
SHOW INDEXES;
```
