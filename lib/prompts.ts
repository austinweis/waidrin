// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import * as schemas from "./schemas";
import type { Genre, State } from "./state";

export interface Prompt {
  system: string;
  user: string;
}

function normalize(text: string): string {
  // Normalize prompt text by collapsing single newlines.
  // This allows for cleaner-looking strings in code,
  // while still producing regular single-line prompts.
  const singleNewline = /(?<!\n)\n(?!\n)/g;
  return text.replaceAll(singleNewline, " ").trim();
}

function makePrompt(userPrompt: string, genre: Genre): Prompt {
  return {
    system: `${genre === "fantasy" ? "You are the game master of a text-based fantasy role-playing game." : "You are the facilitator of a choose-your-own-adventure game."}`,
    user: normalize(userPrompt),
  };
}

export const generateWorldPrompt = makePrompt(`
Create a fictional world for a fantasy adventure RPG and return its name
and a short description (100 words maximum) as a JSON object.
Do not use a cliched name like 'Eldoria'.
The world is populated by humans, elves, and dwarves.
`, 'fantasy');
export const generateScenePrompt = makePrompt(`
Create the setting for a historical fiction plot and return the name (e.g. France, 2023)
and a short description (100 words maximum) as a JSON object.
The story can take place in the past or present.
Do not include any information about the protagonist.
`, 'reality');
export const generatePlanetPrompt = makePrompt(`  
`, 'scifi');
export const generateFuturePrompt = makePrompt(`
`, 'scifi');

export function generateProtagonistPrompt(state: State): Prompt {
  let prompt: string;
  switch (state.genre) {
    case 'fantasy':
      prompt = `
Create a ${state.protagonist.gender} ${state.protagonist.race} protagonist
for a fantasy adventure set in the world of ${state.world.name}.

${state.world.description}

Return the character description as a JSON object. Include a short biography (100 words maximum).
`
      break;
    default:
      prompt = `
Create a ${state.protagonist.gender} protagonist
for a fictional story set in ${state.world.name}.

${state.world.description}

Return the character description as a JSON object. Include a short biography (100 words maximum).
`
      break;
  }
  return makePrompt(prompt, state.genre);
}

export function generateStartingLocationPrompt(state: State): Prompt {
  let prompt: string;
  switch (state.genre) {
    case 'fantasy':
      prompt = `
Create a starting location for a fantasy adventure set in the world of ${state.world.name}.

${state.world.description}

Return the name and type of the location, and a short description (100 words maximum), as a JSON object.
Choose from the following location types: ${Object.values(schemas.generalLocations.concat(schemas.fantasyLocations)).join(", ")}`
    break;
    default:
      prompt = `
Create a starting location for a choose your own adventure game set in ${state.world.name}.

Return the name and type of the location, and a short description (100 words maximum), as a JSON object.
Choose from the following location types: ${Object.values(schemas.generalLocations.concat(schemas.realityLocations)).join(", ")}`
    break;
  }
  return makePrompt(prompt, state.genre);
}

export function generateStartingCharactersPrompt(state: State): Prompt {
  const location = state.locations[state.protagonist.locationIndex];
  let prompt: string;

  switch (state.genre) {
    case 'fantasy':
      prompt = `
This is the start of a fantasy adventure set in the world of ${state.world.name}. ${state.world.description}

The protagonist is ${state.protagonist.name}. ${state.protagonist.biography}

${state.protagonist.name} is about to enter ${location.name}. ${location.description}

Create 5 characters that ${state.protagonist.name} might encounter at ${location.name}.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`;
    break;
  default:
    prompt = `
This is the start of a choose-your-own-adventure game. 

The player's character is ${state.protagonist.name}. ${state.protagonist.biography}

${state.protagonist.name} is about to enter ${location.name}. ${location.description}

Create 5 characters that ${state.protagonist.name} might encounter at ${location.name}.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`;
    break;
  }

  return makePrompt(prompt, state.genre);
}

function makeMainPrompt(prompt: string, state: State): Prompt {
  const context = state.events
    .map((event) => {
      if (event.type === "narration") {
        return event.text;
      } else if (event.type === "character_introduction") {
        // Implied in the narration.
        return null;
      } else if (event.type === "location_change") {
        // Also implied in the narration, but used to structure the story and describe available characters.
        const location = state.locations[event.locationIndex];
        return normalize(`
-----

LOCATION CHANGE

${state.protagonist.name} is entering ${location.name}. ${location.description}

The following characters are present at ${location.name}:

${event.presentCharacterIndices
            .map((index) => {
              const character = state.characters[index];
              return `${character.name}: ${character.biography}`;
            })
            .join("\n\n")}

-----
`);
      }
    })
    .filter((text) => !!text)
    .join("\n\n");
  
  let fullPrompt: string;
  switch (state.genre){
    case 'fantasy':
      fullPrompt = `
This is a fantasy adventure RPG set in the world of ${state.world.name}. ${state.world.description}

The protagonist (who you should refer to as "you" in your narration, as the adventure happens from their perspective)
is ${state.protagonist.name}. ${state.protagonist.biography}

Here is what has happened so far:

${context}



${normalize(prompt)}
`;
  break;
  default:
    fullPrompt = `
This is a choose your own adventure game ${state.world.name}. ${state.world.description}

The protagonist (who you should refer to as "you" in your narration, as the adventure happens from their perspective)
is ${state.protagonist.name}. ${state.protagonist.biography}

Here is what has happened so far:

${context}



${normalize(prompt)}
`;
  break;
  }
  return makePrompt(fullPrompt, state.genre);
}

export function narratePrompt(state: State, action?: string): Prompt {
  return makeMainPrompt(
    `
${action ? `The protagonist (${state.protagonist.name}) has chosen to do the following: ${action}.` : ""}
Narrate what happens next, ${state.genre === 'fantasy' ? 'using novel-style prose' : state.genre === 'scifi' ? 'using a mysterious tone' : 'using plain language'}, in the present tense.
Prioritize dialogue over descriptions.
Do not mention more than 2 different characters in your narration.
Refer to characters using their first names.
Make all character names bold by surrounding them with double asterisks (**Name**).
Write 2-3 paragraphs (no more than 200 words in total).
Stop when it is the protagonist's turn to speak or act.
Remember to refer to the protagonist (${state.protagonist.name}) as "you" in your narration.
Do not explicitly ask the protagonist for a response at the end; they already know what is expected of them.
`,
    state,
  );
}

export function generateActionsPrompt(state: State): Prompt {
  return makeMainPrompt(
    `
Suggest 3 options for what the protagonist (${state.protagonist.name}) could do or say next.
Each option should be a single, short sentence that starts with a verb.
Return the options as a JSON array of strings.
`,
    state,
  );
}

export function checkIfSameLocationPrompt(state: State): Prompt {
  return makeMainPrompt(
    `
Is the protagonist (${state.protagonist.name}) still at ${state.locations[state.protagonist.locationIndex].name}?
Answer with "yes" or "no".
`,
    state,
  );
}

export function generateNewLocationPrompt(state: State): Prompt {
  return makeMainPrompt(
    `
The protagonist (${state.protagonist.name}) has left ${state.locations[state.protagonist.locationIndex].name}.
Return the name and type of their new location, and a short description (100 words maximum), as a JSON object.
Also include the names of the characters that are going to accompany ${state.protagonist.name} there, if any.
`,
    state,
  );
}

// Must be called *before* adding the location change event to the state!
export function generateNewCharactersPrompt(state: State, accompanyingCharacters: string[]): Prompt {
  const location = state.locations[state.protagonist.locationIndex];

  return makeMainPrompt(
    `
The protagonist (${state.protagonist.name}) is about to enter ${location.name}. ${location.description}

${accompanyingCharacters.length > 0 ? `${state.protagonist.name} is accompanied by the following characters: ${accompanyingCharacters.join(", ")}.` : ""}

Create 5 additional, new characters that ${state.protagonist.name} might encounter at ${location.name}.
Do not reuse characters that have already appeared in the story.
Return the character descriptions as an array of JSON objects.
Include a short biography (100 words maximum) for each character.
`,
    state,
  );
}
