"""Tests for scripts/classify_lands.py's pure classify_land()."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from classify_lands import classify_land  # noqa: E402


def test_slowland_conditional_untapped_tier2():
    result = classify_land(
        "Deserted Beach",
        "Land",
        "This land enters tapped unless you control two or more other lands.\n{T}: Add {W} or {U}.",
        None,
    )
    assert result["land_category"] == "slow"
    assert result["tier"] == 2
    assert result["enters_untapped"] == 1


def test_starting_town_conditional_untapped_tier2():
    result = classify_land(
        "Starting Town",
        "Land — Town",
        "This land enters tapped unless it's your first, second, or third turn of the game.\n"
        "{T}: Add {C}.\n{T}, Pay 1 life: Add one mana of any color.",
        None,
    )
    assert result["land_category"] == "conditional_untapped"
    assert result["tier"] == 2
    assert result["enters_untapped"] == 1


def test_pathway_tapped_mdfc_land_face():
    result = classify_land(
        "Revitalizing Repast // Old-Growth Grove",
        "Instant // Land",
        "Put a +1/+1 counter on target creature. It gains indestructible until end of turn.\n"
        "//\nThis land enters tapped.\n{T}: Add {B} or {G}.",
        None,
    )
    assert result["land_category"] == "tapped"
    assert result["tier"] == 4
    assert result["enters_untapped"] == 0


def test_pathway_untapped_land_face_stays_pathway():
    result = classify_land(
        "Cragcrown Pathway // Timbercrown Pathway",
        "Land // Land",
        "{T}: Add {R}.\n//\n{T}: Add {G}.",
        None,
    )
    assert result["land_category"] == "pathway"
    assert result["tier"] == 2
    assert result["enters_untapped"] == 1


def test_multiversal_passage_chosen_basic_shock():
    result = classify_land(
        "Multiversal Passage",
        "Land",
        "As this land enters, choose a basic land type. Then you may pay 2 life. "
        "If you don't, it enters tapped.\nThis land is the chosen type.",
        None,
    )
    assert result["land_category"] == "shock"
    assert result["tier"] == 1


def test_true_tribal_land_unaffected():
    result = classify_land(
        "Path of Ancestry",
        "Land",
        "As this land enters, choose a creature type. It enters tapped.\n"
        "{T}: Add one mana of any color.",
        None,
    )
    assert result["land_category"] == "tribal"
    assert result["tier"] == 2


# U9a finding 5 — "As this land enters, you may pay 3 life. If you don't, it
# enters tapped." was misfiled as tier-4 always-tapped by the generic
# "enters.*tapped" fallback / MDFC pathway branch. It's a shock-like choice.
def test_shatterskull_smashing_pay_life_land_face_is_shock_not_tapped():
    result = classify_land(
        "Shatterskull Smashing // Shatterskull, the Hammer Pass",
        "Sorcery // Land",
        "Shatterskull Smashing deals X damage divided as you choose among up to "
        "two target creatures and/or planeswalkers. If X is 6 or more, "
        "Shatterskull Smashing deals twice X damage divided as you choose among "
        "them instead.\n//\nAs this land enters, you may pay 3 life. If you "
        "don't, it enters tapped.\n{T}: Add {R}.",
        None,
    )
    assert result["land_category"] == "shock"
    assert result["tier"] == 1
    assert result["enters_untapped"] == 1


def test_agadeems_awakening_pay_life_land_face_is_shock_not_tapped():
    result = classify_land(
        "Agadeem's Awakening // Agadeem, the Undercrypt",
        "Sorcery // Land",
        "Return from your graveyard to the battlefield any number of target "
        "creature cards that each have a different mana value X or less.\n//\n"
        "As this land enters, you may pay 3 life. If you don't, it enters "
        "tapped.\n{T}: Add {B}.",
        None,
    )
    assert result["land_category"] == "shock"
    assert result["tier"] == 1
    assert result["enters_untapped"] == 1
