import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamRegistration {
  id: string;
  team_name: string;
  problem_id: string;
  member1_name: string;
  member1_roll: string;
  member1_year: string;
  member1_department: string;
  member1_phone: string;
  member1_email: string;
  member2_name?: string;
  member2_roll?: string;
  member2_year?: string;
  member2_department?: string;
  member2_phone?: string;
  member2_email?: string;
  member3_name?: string;
  member3_roll?: string;
  member3_year?: string;
  member3_department?: string;
  member3_phone?: string;
  member3_email?: string;
  member4_name?: string;
  member4_roll?: string;
  member4_year?: string;
  member4_department?: string;
  member4_phone?: string;
  member4_email?: string;
  year?: string;
  department?: string;
  phone?: string;
  email?: string;
  document_url?: string;
  document_filename?: string;
  created_at: string;
  problem_title?: string;
  theme?: string;
}

interface ProblemStatement {
  problem_statement_id: string;
  title: string;
}

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamRegistration | null;
  problems: ProblemStatement[];
  onSave: (data: Omit<TeamRegistration, "id" | "created_at" | "problem_title" | "theme">) => Promise<void>;
  loading: boolean;
}

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  problems,
  onSave,
  loading,
}: TeamFormDialogProps) {
  const [formData, setFormData] = useState({
    team_name: "",
    problem_id: "",
    member1_name: "",
    member1_roll: "",
    member1_year: "",
    member1_department: "",
    member1_phone: "",
    member1_email: "",
    member2_name: "",
    member2_roll: "",
    member3_name: "",
    member3_roll: "",
    member4_name: "",
    member4_roll: "",
    document_url: "",
  });

  useEffect(() => {
    if (team) {
      setFormData({
        team_name: team.team_name,
        problem_id: team.problem_id,
        member1_name: team.member1_name,
        member1_roll: team.member1_roll,
        member1_year: team.member1_year || "",
        member1_department: team.member1_department || "",
        member1_phone: team.member1_phone || "",
        member1_email: team.member1_email || "",
        member2_name: team.member2_name || "",
        member2_roll: team.member2_roll || "",
        member3_name: team.member3_name || "",
        member3_roll: team.member3_roll || "",
        member4_name: team.member4_name || "",
        member4_roll: team.member4_roll || "",
        document_url: team.document_url || "",
      });
    } else {
      setFormData({
        team_name: "",
        problem_id: "",
        member1_name: "",
        member1_roll: "",
        member1_year: "",
        member1_department: "",
        member1_phone: "",
        member1_email: "",
        member2_name: "",
        member2_roll: "",
        member3_name: "",
        member3_roll: "",
        member4_name: "",
        member4_roll: "",
        document_url: "",
      });
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {team ? "Edit Team Registration" : "Add Team Registration"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="team_name">Team Name</Label>
              <Input
                id="team_name"
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="problem_id">Problem Statement</Label>
              <Select
                value={formData.problem_id}
                onValueChange={(value) => setFormData({ ...formData, problem_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select problem" />
                </SelectTrigger>
                <SelectContent>
                  {problems.map((problem) => (
                    <SelectItem key={problem.problem_statement_id} value={problem.problem_statement_id}>
                      {problem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Member 1 — full details */}
          <div className="border rounded-lg p-3 space-y-3">
            <p className="font-medium text-sm">Member 1 (Team Leader)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={formData.member1_name} onChange={(e) => setFormData({ ...formData, member1_name: e.target.value })} required />
              </div>
              <div>
                <Label>Roll No.</Label>
                <Input value={formData.member1_roll} onChange={(e) => setFormData({ ...formData, member1_roll: e.target.value })} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={formData.member1_phone} onChange={(e) => setFormData({ ...formData, member1_phone: e.target.value })} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.member1_email} onChange={(e) => setFormData({ ...formData, member1_email: e.target.value })} required />
              </div>
              <div>
                <Label>Year</Label>
                <Select value={formData.member1_year} onValueChange={(v) => setFormData({ ...formData, member1_year: v })}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Year">1st Year</SelectItem>
                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                    <SelectItem value="4th Year">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Input value={formData.member1_department} onChange={(e) => setFormData({ ...formData, member1_department: e.target.value })} required />
              </div>
            </div>
          </div>

          {/* Members 2–4 — name + roll only */}
          {([2, 3, 4] as const).map((n) => (
            <div key={n} className="grid grid-cols-2 gap-4">
              <div>
                <Label>{`Member ${n} Name`}</Label>
                <Input
                  value={(formData as any)[`member${n}_name`]}
                  onChange={(e) => setFormData({ ...formData, [`member${n}_name`]: e.target.value })}
                />
              </div>
              <div>
                <Label>{`Member ${n} Roll`}</Label>
                <Input
                  value={(formData as any)[`member${n}_roll`]}
                  onChange={(e) => setFormData({ ...formData, [`member${n}_roll`]: e.target.value })}
                />
              </div>
            </div>
          ))}

          <div>
            <Label htmlFor="document_url">Document URL</Label>
            <Input
              id="document_url"
              value={formData.document_url}
              onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : team ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
