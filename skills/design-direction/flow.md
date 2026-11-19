# How design direction works

From what you like to a library of what your references use. Orange steps are yours: nothing moves past them until you answer. Grey steps are the agent's.

```mermaid
flowchart TD
    Q["<b>Three questions</b><br/>feel and never feel · your moodboard? · where to look"]:::you
    Q -->|a moodboard| B["Read your board"]
    Q -->|no moodboard| S["Search wide"]
    B --> E{"Enough?<br/>a family of six, every part covered"}
    E -->|yes| P
    E -->|no| G["<b>Search for the gap, or go?</b>"]:::you
    G -->|search| S
    G -->|go| P
    S --> C["Check the pool on contact sheets<br/>drop only non-screens and broken rows<br/>search again if it is thin"]
    C --> K["<b>Picker</b><br/>like · no · why"]:::you
    K --> R["<b>Read the picks back</b><br/>Is that it?"]:::you
    R -->|once| S2["Sharper second search"] --> K
    R -->|yes| P

    P["Profile every reference<br/>measured: picture, figure, page<br/>tagged: what the picture is, type, layout"]
    P --> F["Families<br/>numbers first, then the eye<br/>bins broken up · strays placed"]
    F --> O["<b>Families board</b><br/>take any · note a split or merge<br/>take a pair as a seed · take none"]:::you
    O -->|none taken| W["Search from your words"] --> P
    O --> M["<b>Mark the board</b><br/>one Lead · Likes · Noes · move a tile"]:::you
    M --> X{"Likes in<br/>another family?"}
    X -->|yes| XA["<b>Bring them in, or keep for later?</b>"]:::you --> RB
    X -->|no| RB["<b>Marks read back</b>"]:::you
    RB --> N{"Lead and Likes<br/>six or more?"}
    N -->|no| NS["<b>Search for more like them, or go?</b>"]:::you --> RB
    N -->|yes| L["Read the library<br/>arrangements · navigation · type · grounds · accents · family"]
    L --> LR["<b>Library readout</b><br/>drop or swap anything?"]:::you
    LR --> D["Write direction.md"]
    D --> DD["<b>Change anything, or take this into design?</b>"]:::you
    DD -->|design| Z["design: deal screens from the library, you pick"]

    classDef default fill:#f1f1ef,stroke:#8a8a85,color:#222
    classDef you fill:#fde3c8,stroke:#c2410c,color:#3b1d0b
```

What each file holds, all in `design-exploration/<slug>/`, which stays on your machine:

| File | What it is |
|---|---|
| `profiles.json` | Everything known about each reference: its measured picture and page, and the agent's tags |
| `families.json`, `board.md` | The families, most typical first, and the cards the boards are built from |
| `library.json` | What your Lead and Likes use, measured, with nothing chosen |
| `direction.md` | The subject, feel, voice, what to leave, the family, and the references for other parts |

"Go" or "you choose" at any orange step lets the agent decide that step, and it says what it chose.
