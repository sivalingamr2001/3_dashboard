namespace Backend.OuDashboard.Models;

/// <summary>
/// One row per Operating Unit.
/// Column names match dbo.OuDashboardSummary exactly.
/// Monetary values already converted to INR by Ou_Currency_Conv_Rate inside Oracle.
/// </summary>
public class OuDashboardRecord
{
    // ── Identity ─────────────────────────────────────────────────────────────
    public string  OuName                { get; set; } = string.Empty;

    // ── Previous FY Sales ────────────────────────────────────────────────────
    public decimal PrevFySaleAsOn        { get; set; }   // PREV_FY_SALE_AS_ON
    public decimal PrevFySaleCurrntMnth  { get; set; }   // PREV_FY_SALE_CURRNT_MNTH

    // ── Current FY Sales ─────────────────────────────────────────────────────
    public decimal CurrFySaleAsOn        { get; set; }   // CURR_FY_SALE_AS_ON
    public decimal CurrFySaleCurrntMnth  { get; set; }   // CURR_FY_SALE_CURRNT_MNTH

    // ── Previous FY Pending Orders ───────────────────────────────────────────
    public decimal PrevFyPendAsOn        { get; set; }   // PREV_FY_PEND_AS_ON
    public decimal PrevFyPendCurrntMnth  { get; set; }   // PREV_FY_PEND_CURRNT_MNTH

    // ── Current FY Pending Orders ────────────────────────────────────────────
    public decimal CurrFyPendAsOn        { get; set; }   // CURR_FY_PEND_AS_ON
    public decimal CurrFyPendCurrntMnth  { get; set; }   // CURR_FY_PEND_CURRNT_MNTH

    // ── Inventory ────────────────────────────────────────────────────────────
    public decimal InvAmt                { get; set; }   // INV_AMT

    // ── Sorting ───────────────────────────────────────────────────────────────
    public int? sortbyorder { get; set; }   // SORT_BY

    // ── Set by .NET before insert ────────────────────────────────────────────
    public string  StockTransferFlag     { get; set; } = "Y";
    public DateTime MigratedAt           { get; set; } = DateTime.Now;
    public DateTime SnapshotDate         { get; set; } = DateTime.Today;
}