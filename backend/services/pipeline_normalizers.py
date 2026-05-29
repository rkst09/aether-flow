from __future__ import annotations

from typing import Any


PERSONA_TAGS = {"Primary", "Secondary", "Edge", "Admin"}
ACCESS_LEVELS = {"Full", "Limited", "Delegated", "Admin"}
DEVICE_TYPES = {"Desktop", "Mobile", "Hybrid"}
TECH_PROFICIENCY = {"Beginner", "Moderate", "Advanced", "Expert"}
PRIORITIES = {"High", "Medium", "Low"}
IMPACT_TYPES = {"Retention", "Conversion", "Experience", "Performance"}
SCREEN_TYPES = {"Entry", "Action", "Detail", "System", "Feedback"}
SCREEN_STATES = {"Loading", "Empty", "Error", "Success"}
COMPLEXITIES = {"Simple", "Medium", "Complex"}
PROMPT_BEHAVIOR_TAGS = {"Decision Maker", "Operator", "Executor", "Reviewer", "Observer"}


def as_string(value: Any, fallback: str = "") -> str:
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or fallback
    if value is None:
        return fallback
    cleaned = str(value).strip()
    return cleaned or fallback


def as_int(value: Any, fallback: int, minimum: int | None = None, maximum: int | None = None) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = fallback

    if minimum is not None:
        number = max(minimum, number)
    if maximum is not None:
        number = min(maximum, number)
    return number


def as_bool(value: Any, fallback: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    return fallback


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def unique_strings(values: Any, fallback: list[str] | None = None, limit: int | None = None) -> list[str]:
    items = []
    seen = set()
    for item in as_list(values):
        normalized = as_string(item)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        items.append(normalized)
        if limit is not None and len(items) >= limit:
            break
    if items:
        return items
    return list(fallback or [])


def enum_value(value: Any, allowed: set[str], fallback: str) -> str:
    normalized = as_string(value, fallback)
    return normalized if normalized in allowed else fallback


def normalize_personas(result: dict[str, Any]) -> list[dict[str, Any]]:
    personas = []
    for index, raw in enumerate(as_list(result.get("personas"))):
        person = as_dict(raw)
        identity = as_dict(person.get("identity"))
        goals = as_dict(person.get("goals"))
        pain_points = as_dict(person.get("painPoints"))
        behavior = as_dict(person.get("behavior"))
        psychographics = as_dict(person.get("psychographics"))
        journey = as_dict(person.get("journey"))
        business_value = as_dict(person.get("businessValue"))

        name = as_string(person.get("name"), f"Persona {index + 1}")
        personas.append({
            "name": name,
            "tag": enum_value(person.get("tag"), PERSONA_TAGS, "Primary"),
            "archetype": as_string(person.get("archetype"), "Core user archetype"),
            "confidence": as_int(person.get("confidence"), 75, 40, 99),
            "identity": {
                "role": as_string(identity.get("role"), "User"),
                "context": as_string(identity.get("context"), "Uses the product to complete core workflow tasks."),
                "accessLevel": enum_value(identity.get("accessLevel"), ACCESS_LEVELS, "Full"),
                "device": enum_value(identity.get("device"), DEVICE_TYPES, "Desktop"),
            },
            "goals": {
                "primary": unique_strings(goals.get("primary"), ["Complete the core workflow reliably."], 3),
                "secondary": unique_strings(goals.get("secondary"), ["Reduce manual effort."], 2),
                "emotional": unique_strings(goals.get("emotional"), ["Feel confident using the product."], 2),
            },
            "painPoints": {
                "functional": unique_strings(pain_points.get("functional"), ["Workflow friction is slowing them down."], 3),
                "emotional": unique_strings(pain_points.get("emotional"), ["Unclear system behavior creates anxiety."], 2),
                "systemGaps": unique_strings(pain_points.get("systemGaps"), ["Important product details are still underspecified."], 2),
            },
            "behavior": {
                "frequency": as_string(behavior.get("frequency"), "Weekly"),
                "techProficiency": enum_value(behavior.get("techProficiency"), TECH_PROFICIENCY, "Moderate"),
                "decisionStyle": as_string(behavior.get("decisionStyle"), "Pragmatic and outcome-focused"),
                "triggers": unique_strings(behavior.get("triggers"), ["Needs to complete a project milestone."], 3),
            },
            "psychographics": {
                "traits": unique_strings(psychographics.get("traits"), ["Goal-oriented", "Practical"], 4),
                "riskTolerance": as_string(psychographics.get("riskTolerance"), "Prefers predictable workflows and clear guidance."),
                "trustFactors": unique_strings(psychographics.get("trustFactors"), ["Transparent system feedback"], 3),
                "values": unique_strings(psychographics.get("values"), ["Clarity", "Efficiency", "Reliability"], 3),
            },
            "journey": {
                "entryPoint": as_string(journey.get("entryPoint"), "Starts from the main workflow entry point."),
                "keyActions": unique_strings(journey.get("keyActions"), ["Review inputs", "Complete the next workflow step"], 4),
                "dropOffRisks": unique_strings(journey.get("dropOffRisks"), ["Ambiguous outputs reduce confidence."], 3),
                "successDefinition": as_string(journey.get("successDefinition"), "They can complete the task confidently with minimal rework."),
            },
            "businessValue": {
                "revenueImpact": as_string(business_value.get("revenueImpact"), "Medium - supports core product value."),
                "retentionImportance": as_string(business_value.get("retentionImportance"), "High - this persona is important to repeat usage."),
                "priorityScore": as_int(business_value.get("priorityScore"), 70, 1, 100),
            },
            "missingData": unique_strings(person.get("missingData"), []),
            "aiRecommendations": unique_strings(person.get("aiRecommendations"), ["Add clearer workflow support for this persona."], 2),
        })
    return personas


def normalize_journeys(result: dict[str, Any], allowed_personas: set[str]) -> list[dict[str, Any]]:
    journeys = []
    for index, raw in enumerate(as_list(result.get("journey_maps"))):
        journey_map = as_dict(raw)
        persona_name = as_string(journey_map.get("persona_name"), f"Persona {index + 1}")
        if allowed_personas and persona_name not in allowed_personas:
            continue

        normalized_stages = []
        for stage_index, raw_stage in enumerate(as_list(journey_map.get("stages"))):
            stage = as_dict(raw_stage)
            opportunities = []
            for raw_opportunity in as_list(stage.get("opportunities")):
                opportunity = as_dict(raw_opportunity)
                opportunities.append({
                    "text": as_string(opportunity.get("text"), "Clarify this stage with a stronger design intervention."),
                    "impact": enum_value(opportunity.get("impact"), PRIORITIES, "Medium"),
                    "effort": enum_value(opportunity.get("effort"), PRIORITIES, "Medium"),
                })

            normalized_stages.append({
                "title": as_string(stage.get("title"), f"Stage {stage_index + 1}"),
                "emotionScore": as_int(stage.get("emotionScore"), 3, 1, 5),
                "actions": unique_strings(stage.get("actions"), ["Move through the workflow."], 4),
                "thoughts": unique_strings(stage.get("thoughts"), ["What happens next?"], 3),
                "painPoints": unique_strings(stage.get("painPoints"), ["A key friction point needs clarification."], 3),
                "systemGaps": unique_strings(stage.get("systemGaps"), ["The system does not fully support this stage yet."], 2),
                "opportunities": opportunities[:2] or [{
                    "text": "Improve support and guidance for this stage.",
                    "impact": "Medium",
                    "effort": "Medium",
                }],
            })

        if normalized_stages:
            journeys.append({
                "persona_name": persona_name,
                "stages": normalized_stages[:6],
            })
    return journeys


def normalize_backlog_modules(result: dict[str, Any], allowed_personas: set[str]) -> list[dict[str, Any]]:
    modules = []
    for index, raw in enumerate(as_list(result.get("modules"))):
        module = as_dict(raw)
        items = []
        for item_index, raw_item in enumerate(as_list(module.get("items"))):
            item = as_dict(raw_item)
            persona_names = [
                name for name in unique_strings(item.get("personaNames"), [], 4)
                if not allowed_personas or name in allowed_personas
            ]
            impact = [
                value for value in unique_strings(item.get("impact"), [], 2)
                if value in IMPACT_TYPES
            ] or ["Experience"]

            items.append({
                "featureName": as_string(item.get("featureName"), f"Feature {item_index + 1}"),
                "problemStatement": as_string(item.get("problemStatement"), "This feature addresses an important workflow gap."),
                "personaNames": persona_names,
                "journeyStage": as_string(item.get("journeyStage"), "Core Workflow"),
                "opportunityDirection": as_string(item.get("opportunityDirection"), "Design a clear and efficient path through this task."),
                "priority": enum_value(item.get("priority"), PRIORITIES, "Medium"),
                "effort": enum_value(item.get("effort"), PRIORITIES, "Medium"),
                "impact": impact,
                "dependencies": unique_strings(item.get("dependencies"), []),
                "edgeCases": unique_strings(item.get("edgeCases"), ["Handle missing or incomplete user input."], 3),
                "warning": as_string(item.get("warning"), "") or None,
            })

        if items:
            modules.append({
                "name": as_string(module.get("name"), f"Module {index + 1}"),
                "description": as_string(module.get("description"), "Grouped design work for this product area."),
                "items": items[:6],
            })
    return modules


def normalize_screen_modules(result: dict[str, Any], allowed_personas: set[str]) -> list[dict[str, Any]]:
    modules = []
    for index, raw in enumerate(as_list(result.get("screen_modules"))):
        module = as_dict(raw)
        screens = []
        for screen_index, raw_screen in enumerate(as_list(module.get("screens"))):
            screen = as_dict(raw_screen)
            persona_names = [
                name for name in unique_strings(screen.get("personaNames"), [], 4)
                if not allowed_personas or name in allowed_personas
            ]
            states = [
                state for state in unique_strings(screen.get("states"), [], 4)
                if state in SCREEN_STATES
            ]
            screen_type = enum_value(screen.get("type"), SCREEN_TYPES, "Action")
            if not states:
                states = ["Loading", "Error"] if screen_type == "Entry" else ["Loading", "Empty", "Error", "Success"]

            screens.append({
                "name": as_string(screen.get("name"), f"Screen {screen_index + 1}"),
                "type": screen_type,
                "personaNames": persona_names,
                "purpose": as_string(screen.get("purpose"), "Supports a key task in the workflow."),
                "journeyStage": as_string(screen.get("journeyStage"), "Core Workflow"),
                "backlogRef": as_string(screen.get("backlogRef"), "Mapped backlog item"),
                "entryPoints": unique_strings(screen.get("entryPoints"), ["Primary workflow entry"], 3),
                "exitPoints": unique_strings(screen.get("exitPoints"), ["Next workflow step"], 3),
                "componentHints": unique_strings(screen.get("componentHints"), ["Card", "Button", "Form"], 6),
                "states": states,
                "complexity": enum_value(screen.get("complexity"), COMPLEXITIES, "Medium"),
                "shared": as_bool(screen.get("shared"), len(persona_names) > 1),
                "warning": as_string(screen.get("warning"), "") or None,
            })

        if screens:
            modules.append({
                "name": as_string(module.get("name"), f"Screen Module {index + 1}"),
                "screens": screens[:8],
            })
    return modules


def normalize_persona_prompts(result: dict[str, Any], personas: list[dict[str, Any]], persona_screen_counts: dict[str, int]) -> list[dict[str, Any]]:
    persona_lookup = {as_string(persona.get("name")): persona for persona in personas}
    prompts = []

    for raw in as_list(result.get("persona_prompts")):
        prompt = as_dict(raw)
        persona_name = as_string(prompt.get("personaName"))
        if persona_name not in persona_lookup:
            continue

        sections = []
        for index, raw_section in enumerate(as_list(prompt.get("sections"))):
            section = as_dict(raw_section)
            sections.append({
                "id": as_string(section.get("id"), f"s{index}"),
                "title": as_string(section.get("title"), "Section"),
                "content": as_string(section.get("content"), "Add concrete implementation guidance for this section."),
                "hint": as_string(section.get("hint"), "Expand this section with more product-specific detail."),
            })

        if not sections:
            continue

        prompts.append({
            "personaName": persona_name,
            "tag": enum_value(prompt.get("tag"), PERSONA_TAGS, "Primary"),
            "quality": as_int(prompt.get("quality"), 75, 60, 100),
            "screensCount": max(as_int(prompt.get("screensCount"), persona_screen_counts.get(persona_name, 0), 0), persona_screen_counts.get(persona_name, 0)),
            "sections": sections,
        })

    return prompts


def normalize_system_prompt(raw_prompt: Any, personas: list[dict[str, Any]], total_screens: int, platform: str) -> dict[str, Any]:
    prompt = as_dict(raw_prompt)
    persona_lookup = {as_string(persona.get("name")): persona for persona in personas}

    sections = []
    for index, raw_section in enumerate(as_list(prompt.get("sections"))):
        section = as_dict(raw_section)
        sections.append({
            "id": as_string(section.get("id"), f"s{index}"),
            "title": as_string(section.get("title"), "Section"),
            "content": as_string(section.get("content"), "Add more implementation detail for this section."),
        })

    influences = []
    for raw_influence in as_list(prompt.get("personaInfluences")):
        influence = as_dict(raw_influence)
        name = as_string(influence.get("name"))
        if name not in persona_lookup:
            continue

        persona = persona_lookup[name]
        influences.append({
            "name": name,
            "role": as_string(influence.get("role"), as_string(persona.get("role"), "User")),
            "tag": enum_value(influence.get("tag"), PERSONA_TAGS, "Primary"),
            "initial": as_string(influence.get("initial"), "".join(part[:1] for part in name.split()[:2]).upper()),
            "keyGoal": as_string(influence.get("keyGoal"), "Complete the primary workflow with confidence."),
            "behaviorTag": enum_value(influence.get("behaviorTag"), PROMPT_BEHAVIOR_TAGS, "Operator"),
            "contributions": unique_strings(influence.get("contributions"), ["Introduced a key workflow requirement."], 3),
        })

    return {
        "quality": as_int(prompt.get("quality"), 80, 60, 100),
        "totalScreens": as_int(prompt.get("totalScreens"), total_screens, 0),
        "platform": as_string(prompt.get("platform"), platform),
        "sections": sections,
        "personaInfluences": influences,
    }
