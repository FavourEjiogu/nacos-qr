-- Cover the office foreign key for registry joins and office-name maintenance.
CREATE INDEX "Memo_officeCode_idx" ON public."Memo"("officeCode");
