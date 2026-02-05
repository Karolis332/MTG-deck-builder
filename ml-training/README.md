# ML Training Data

This directory contains training data and models for the deck suggestion ML system (Phase 2).

## Directory Structure

```
ml-training/
├── datasets/       # Processed training/validation/test datasets
├── exports/        # Raw data exports from the database
└── models/         # Trained model files
```

## Database Table: `ml_training_data`

Aggregated match and deck data for ML training.

### Training Flags
- `is_training` (0/1) - Training set (default: 1)
- `is_validation` (0/1) - Validation set (default: 0)
- `is_test` (0/1) - Test set (default: 0)
- `quality_score` (0-100) - Data quality rating (default: 50)
- `reviewed` (0/1) - Human reviewed (default: 0)

### Data Fields
- `deck_snapshot` - JSON of deck at match time
- `game_outcome` - win/loss/draw
- `mana_curve` - JSON CMC distribution
- `opponent_archetype` - Aggro/Control/Combo/Midrange
- `deck_statistics` - avg_cmc, land_count, creature_count, spell_count

## Phase 2 Integration

Supports supervised learning, archetype classification, win-rate prediction, and synergy detection.

See `AI_MODULE_PLAN.md` for details.
