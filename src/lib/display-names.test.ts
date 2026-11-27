import { describe, expect, it } from "vitest";
import { distinctPartyNames, firstWord, shortNamer } from "./display-names";

describe("shortNamer", () => {
  it("uses first names when they are unique", () => {
    const short = shortNamer(["Chris Hale", "Alex Mora", "Taylor Nguyen"]);
    expect(short("Chris Hale")).toBe("Chris");
    expect(short("Taylor Nguyen")).toBe("Taylor");
  });

  it("keeps full names when two people share a first word", () => {
    const short = shortNamer(["Audit Alex", "Audit Blake", "Audit Bride", "Sam Okonkwo"]);
    expect(short("Audit Alex")).toBe("Audit Alex");
    expect(short("Audit Blake")).toBe("Audit Blake");
    expect(short("Sam Okonkwo")).toBe("Sam");
  });

  it("does not treat the same person listed twice as a clash", () => {
    const short = shortNamer(["Maya Harper", "Maya Harper", "maya  harper"]);
    expect(short("Maya Harper")).toBe("Maya");
  });

  it("handles one-word and unknown names", () => {
    const short = shortNamer(["Kim"]);
    expect(short("Kim")).toBe("Kim");
    expect(short("Pat Alvarez")).toBe("Pat");
    expect(firstWord("  ")).toBe("");
  });
});

describe("distinctPartyNames", () => {
  it("leaves unique party names alone", () => {
    expect(distinctPartyNames([{ name: "Harpers", payerName: "Maya Harper" }, { name: "Chens", payerName: "Priya Chen" }])).toEqual(["Harpers", "Chens"]);
  });

  it("swaps duplicate first-word party names for the payer's full name", () => {
    expect(
      distinctPartyNames([
        { name: "Audit", payerName: "Audit Alex" },
        { name: "Audit", payerName: "Audit Blake" },
        { name: "Sam", payerName: "Sam Okonkwo" },
      ]),
    ).toEqual(["Audit Alex", "Audit Blake", "Sam"]);
  });

  it("falls back to name and payer when payer names also match", () => {
    expect(distinctPartyNames([{ name: "Lee", payerName: "Jo Lee" }, { name: "Lee", payerName: "Jo Lee" }])).toEqual(["Lee · Jo Lee", "Lee · Jo Lee"]);
  });
});
