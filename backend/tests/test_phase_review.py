import unittest

from services.phase_review import build_review_output


class PhaseReviewTests(unittest.TestCase):
    def test_build_review_output_creates_review_metadata(self):
        result = build_review_output(
            {"audit_rich": [{"id": "screen-1"}]},
            user_id="user-123",
            summary="Audit reviewed and approved.",
            metrics={"screen_count": 1, "high_severity_count": 0},
        )

        self.assertEqual(result["audit_rich"][0]["id"], "screen-1")
        self.assertEqual(result["review"]["status"], "reviewed")
        self.assertEqual(result["review"]["summary"], "Audit reviewed and approved.")
        self.assertEqual(result["review"]["confirmed_by"], "user-123")
        self.assertEqual(result["review"]["metrics"]["screen_count"], 1)

    def test_build_review_output_preserves_existing_review_fields(self):
        result = build_review_output(
            {
                "system_prompt": {"quality": 92},
                "review": {"first_confirmed_at": "2026-04-10T00:00:00Z"},
            },
            user_id="user-456",
            summary="Prompts confirmed.",
            status="handoff_ready",
        )

        self.assertEqual(result["review"]["first_confirmed_at"], "2026-04-10T00:00:00Z")
        self.assertEqual(result["review"]["status"], "handoff_ready")
        self.assertEqual(result["review"]["confirmed_by"], "user-456")
