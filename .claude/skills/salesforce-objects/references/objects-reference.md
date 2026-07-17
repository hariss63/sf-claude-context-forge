# Reference: Custom objects & fields (2)

### Account__c
- **Label:** Supplier Account
- **Description:** Tracks external supplier and vendor accounts for procurement workflows.
- **Field count:** 3
- **Field types used:** Currency, Picklist, Checkbox
- **Sample fields:**
  - `AnnualRevenue__c` (Currency)
  - `Industry__c` (Picklist)
  - `IsActive__c` (Checkbox) — required

### Project__c
- **Label:** Project
- **Description:** Tracks internal and client-facing projects, their status, and linked supplier accounts.
- **Field count:** 3
- **Field types used:** Lookup, Date, Picklist
- **Sample fields:**
  - `Account__c` (Lookup)
  - `StartDate__c` (Date)
  - `Status__c` (Picklist)

