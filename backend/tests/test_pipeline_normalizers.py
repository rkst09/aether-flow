import unittest

from services.pipeline_normalizers import (
    normalize_backlog_modules,
    normalize_journeys,
    normalize_persona_prompts,
    normalize_personas,
    normalize_screen_modules,
    normalize_system_prompt,
)


class PipelineNormalizerTests(unittest.TestCase):
    def test_normalize_personas_clamps_and_fills_defaults(self):
        personas = normalize_personas({
            "personas": [{
                "name": "Ava Stone",
                "tag": "Invalid",
                "confidence": 120,
                "identity": {"role": "PM"},
                "goals": {"primary": ["Ship faster"]},
                "painPoints": {},
                "behavior": {},
                "psychographics": {},
                "journey": {},
                "businessValue": {},
            }]
        })

        self.assertEqual(len(personas), 1)
        self.assertEqual(personas[0]["tag"], "Primary")
        self.assertEqual(personas[0]["confidence"], 99)
        self.assertTrue(personas[0]["goals"]["secondary"])

    def test_normalize_journeys_filters_unknown_personas_and_bounds_scores(self):
        journeys = normalize_journeys({
            "journey_maps": [
                {
                    "persona_name": "Known User",
                    "stages": [{"title": "Discover", "emotionScore": 9, "opportunities": []}],
                },
                {
                    "persona_name": "Ghost User",
                    "stages": [{"title": "Ignore"}],
                },
            ]
        }, {"Known User"})

        self.assertEqual(len(journeys), 1)
        self.assertEqual(journeys[0]["stages"][0]["emotionScore"], 5)
        self.assertEqual(journeys[0]["stages"][0]["opportunities"][0]["impact"], "Medium")

    def test_normalize_backlog_modules_filters_personas_and_impact(self):
        modules = normalize_backlog_modules({
            "modules": [{
                "name": "Core",
                "items": [{
                    "featureName": "Review Summary",
                    "personaNames": ["Known User", "Ghost User"],
                    "impact": ["Experience", "Invalid"],
                }]
            }]
        }, {"Known User"})

        self.assertEqual(modules[0]["items"][0]["personaNames"], ["Known User"])
        self.assertEqual(modules[0]["items"][0]["impact"], ["Experience"])

    def test_normalize_screen_modules_adds_required_states(self):
        modules = normalize_screen_modules({
            "screen_modules": [{
                "name": "Core",
                "screens": [{
                    "name": "Dashboard",
                    "type": "Action",
                    "personaNames": ["Known User"],
                    "states": [],
                }]
            }]
        }, {"Known User"})

        self.assertEqual(modules[0]["screens"][0]["states"], ["Loading", "Empty", "Error", "Success"])

    def test_normalize_prompts_and_system_prompt_filter_unknown_personas(self):
        personas = [
            {"name": "Ava Stone", "role": "PM"},
            {"name": "Liam Reed", "role": "Designer"},
        ]
        persona_prompts = normalize_persona_prompts({
            "persona_prompts": [
                {
                    "personaName": "Ava Stone",
                    "sections": [{"title": "Context", "content": "Specific guidance"}],
                },
                {
                    "personaName": "Ghost User",
                    "sections": [{"title": "Ignore", "content": "Nope"}],
                },
            ]
        }, personas, {"Ava Stone": 3})

        system_prompt = normalize_system_prompt({
            "quality": 101,
            "sections": [{"title": "Architecture", "content": "Detailed system map"}],
            "personaInfluences": [
                {"name": "Liam Reed", "behaviorTag": "Reviewer", "contributions": ["Added review states"]},
                {"name": "Ghost User", "behaviorTag": "Operator"},
            ],
        }, personas, 12, "Web App")

        self.assertEqual(len(persona_prompts), 1)
        self.assertEqual(persona_prompts[0]["screensCount"], 3)
        self.assertEqual(system_prompt["quality"], 100)
        self.assertEqual(len(system_prompt["personaInfluences"]), 1)


if __name__ == "__main__":
    unittest.main()
