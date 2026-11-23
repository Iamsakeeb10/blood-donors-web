import { describe, expect, it } from "vitest";
import { inviteMessage, requestMessage, waLink } from "./share";

describe("requestMessage", () => {
  it("includes the group and a prefilled search link", () => {
    const message = requestMessage({ group: "O+", district: "রংপুর" });
    expect(message).toContain("O+");
    expect(message).toContain("রংপুর");
    expect(message).toContain("g=O%2B");
    expect(message).toContain("d=%E0%A6%B0");
  });

  it("omits the district part when none is selected", () => {
    expect(requestMessage({ group: "AB-" })).not.toContain("এলাকা:");
  });
});

describe("inviteMessage", () => {
  it("links to the join route", () => {
    expect(inviteMessage()).toContain("/join");
  });
});

describe("waLink", () => {
  it("adds the 880 country code to local numbers", () => {
    expect(waLink("01712345678")).toBe("https://wa.me/8801712345678");
  });

  it("appends an encoded prefilled message", () => {
    const url = waLink("01712345678", "হ্যালো O+");
    expect(url.startsWith("https://wa.me/8801712345678?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("হ্যালো O+"));
  });
});
