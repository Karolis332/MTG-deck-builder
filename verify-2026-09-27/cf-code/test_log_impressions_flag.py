"""log_impressions=False must skip the rec_impressions insert; default (True) must insert."""
from app.models import RecommendRequest


def test_log_impressions_defaults_true():
    req = RecommendRequest(cards=["Sol Ring"], commander="Atraxa")
    assert req.log_impressions is True


def test_log_impressions_can_be_disabled():
    req = RecommendRequest(cards=["Sol Ring"], commander="Atraxa", log_impressions=False)
    assert req.log_impressions is False


def test_recommend_route_gates_impression_insert_on_flag():
    """Static check that the insert is gated by req.log_impressions (not just the field
    existing) — guards against the flag being added but never wired into recommend.py."""
    import inspect
    from app.routers import recommend
    src = inspect.getsource(recommend)
    idx_if = src.index("if req.log_impressions:")
    idx_insert = src.index("INSERT INTO rec_impressions")
    assert idx_if < idx_insert, "rec_impressions insert is not nested under the log_impressions gate"


if __name__ == "__main__":
    test_log_impressions_defaults_true()
    test_log_impressions_can_be_disabled()
    test_recommend_route_gates_impression_insert_on_flag()
    print("OK")
