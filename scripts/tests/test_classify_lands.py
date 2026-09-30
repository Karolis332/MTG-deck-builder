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
    # "It enters tapped." is unconditional — tapped, and no tapped land is tier 2.
    assert result["enters_untapped"] == 0
    assert result["tier"] == 3


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


# ── Unit L (2026-09-30, audit B-D2 / A-D2 / A-D7 / A-D8) ────────────────────
# "Untapped only when true": the branch a land falls into must not leave the
# default enters_untapped=True on a land whose oracle text says it enters
# tapped unconditionally, and reveal-a-type lands must carry their condition.

def test_grand_coliseum_unconditional_tapped_pain_is_tapped_tier3():
    result = classify_land(
        "Grand Coliseum", "Land",
        "This land enters tapped.\n{T}: Add {C}.\n{T}: Add one mana of any color. This land deals 1 damage to you.",
        '["B","C","G","R","U","W"]',
    )
    assert result["enters_untapped"] == 0
    assert result["tier"] == 3


def test_murmuring_bosk_reveal_treefolk_condition_recorded():
    result = classify_land(
        "Murmuring Bosk", "Land — Forest",
        "({T}: Add {G}.)\nAs this land enters, you may reveal a Treefolk card from your hand. If you don't, this land enters tapped.\n{T}: Add {W} or {B}. This land deals 1 damage to you.",
        '["B","G","W"]',
    )
    assert result["enters_untapped_condition"] == "reveal card of type"


def test_temple_of_the_dragon_queen_reveal_condition_recorded():
    result = classify_land(
        "Temple of the Dragon Queen", "Land",
        "As this land enters, you may reveal a Dragon card from your hand. This land enters tapped unless you revealed a Dragon card this way or you control a Dragon.\nAs this land enters, choose a color.\n{T}: Add one mana of the chosen color.",
        '["B","G","R","U","W"]',
    )
    assert result["enters_untapped_condition"] == "reveal card of type"


def test_mana_confluence_is_pain_tier2_not_utility():
    result = classify_land("Mana Confluence", "Land", "{T}, Pay 1 life: Add one mana of any color.", '["B","G","R","U","W"]')
    assert result["land_category"] == "pain"
    assert result["tier"] == 2
    assert result["enters_untapped"] == 1


def test_tapped_tri_fetch_riveteers_overlook_tier3():
    result = classify_land(
        "Riveteers Overlook", "Land",
        "When this land enters, sacrifice it. When you do, search your library for a basic Swamp, Mountain, or Forest card, put it onto the battlefield tapped, then shuffle and you gain 1 life.",
        None,
    )
    assert result["land_category"] == "fetch"
    assert result["tier"] == 3


def test_landscape_deposits_tapped_tier3():
    result = classify_land(
        "Bountiful Landscape", "Land",
        "{T}: Add {C}.\n{T}, Sacrifice this land: Search your library for a basic Forest, Island, or Mountain card, put it onto the battlefield tapped, then shuffle.\nCycling {G}{U}{R}",
        '["C"]',
    )
    assert result["land_category"] == "fetch"
    assert result["tier"] == 3


def test_untapped_fetch_stays_tier1():
    result = classify_land(
        "Misty Rainforest", "Land",
        "{T}, Pay 1 life, Sacrifice this land: Search your library for a Forest or Island card, put it onto the battlefield, then shuffle.",
        None,
    )
    assert result["land_category"] == "fetch"
    assert result["tier"] == 1


def test_verge_is_tier2_verge_category():
    result = classify_land(
        "Bleachbone Verge", "Land",
        "{T}: Add {B}.\n{T}: Add {W}. Activate only if you control a Plains or a Swamp.",
        '["B","W"]',
    )
    assert result["land_category"] == "verge"
    assert result["tier"] == 2
    assert result["enters_untapped"] == 1


def test_channel_land_is_tier2():
    result = classify_land(
        "Otawara, Soaring City", "Legendary Land",
        "{T}: Add {U}.\nChannel — {3}{U}, Discard this card: Return target artifact, creature, enchantment, or planeswalker to its owner's hand. This ability costs {1} less to activate for each legendary creature you control.",
        '["U"]',
    )
    assert result["land_category"] == "channel"
    assert result["tier"] == 2
    assert "channel" in result["synergy_tags"]


def test_artifact_land_is_tier2():
    result = classify_land("Seat of the Synod", "Artifact Land", "{T}: Add {U}.", '["U"]')
    assert result["land_category"] == "artifact"
    assert result["tier"] == 2


def test_bond_land_is_tier2_bond_with_condition():
    result = classify_land(
        "Vault of Champions", "Land",
        "This land enters tapped unless you have two or more opponents.\n{T}: Add {W} or {B}.",
        '["B","W"]',
    )
    assert result["land_category"] == "bond"
    assert result["tier"] == 2
    assert result["enters_untapped"] == 1
    assert result["enters_untapped_condition"] == "two or more opponents"


def test_inventors_fair_tagged_artifact_and_high_market_sac_outlet():
    fair = classify_land(
        "Inventors' Fair", "Legendary Land",
        "At the beginning of your upkeep, if you control three or more artifacts, you gain 1 life.\n{T}: Add {C}.\n{4}, {T}, Sacrifice Inventors' Fair: Search your library for an artifact card, reveal it, put it into your hand, then shuffle. Activate only if you control three or more artifacts.",
        '["C"]',
    )
    assert "artifact" in fair["synergy_tags"]
    market = classify_land("High Market", "Land", "{T}: Add {C}.\n{T}, Sacrifice a creature: You gain 1 life.", '["C"]')
    assert "sac_outlet" in market["synergy_tags"]
    bastion = classify_land("Karn's Bastion", "Land", "{T}: Add {C}.\n{4}, {T}: Proliferate.", '["C"]')
    assert "proliferate" in bastion["synergy_tags"]


def test_removal_tag_ignores_exile_of_own_permanents():
    farm = classify_land(
        "Northampton Farm", "Land",
        "{T}: Add {C}.\n{1}, {T}: Exile target creature you own.\n{2}, {T}, Sacrifice this land: Return a creature card exiled with this land to the battlefield under your control.",
        '["C"]',
    )
    assert "removal" not in farm["synergy_tags"]
    real = classify_land("Bojuka Bog", "Land", "This land enters tapped.\nWhen this land enters, exile target player's graveyard.\n{T}: Add {B}.", '["B"]')
    assert "removal" in real["synergy_tags"]


def test_costly_rainbows_are_tier4():
    citadel = classify_land("Tarnished Citadel", "Land", "{T}: Add {C}.\n{T}: Add one mana of any color. This land deals 3 damage to you.", '["B","C","G","R","U","W"]')
    assert citadel["tier"] == 4
    vale = classify_land("Lotus Vale", "Land", "If this land would enter, sacrifice two untapped lands instead. If you do, put this land onto the battlefield. If you don't, put it into its owner's graveyard instead.\n{T}: Add three mana of any one color.", '["B","G","R","U","W"]')
    assert vale["tier"] == 4
    rainbow = classify_land("Rainbow Vale", "Land", "{T}: Add one mana of any color. At the beginning of the end step, target opponent gains control of this land.", '["B","G","R","U","W"]')
    assert rainbow["tier"] == 4


# ── Unit P2-L (2026-09-30): integrate-2 defects #1 and #2 ──────────────────

def test_transform_land_back_is_not_a_mana_base_land():
    from classify_lands import is_mana_base_land
    assert is_mana_base_land("Artifact — Equipment // Land", "transform") is False
    assert is_mana_base_land("Sorcery // Land", "modal_dfc") is True
    assert is_mana_base_land("Land — Town // Sorcery — Adventure", "adventure") is True
    assert is_mana_base_land("Land", "normal") is True

