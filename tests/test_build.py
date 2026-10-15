import unittest,sys,hashlib,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_data as b
class BuildTests(unittest.TestCase):
 def test_missing_numbers(self):
  for s in ['', '99999','n/a','NaN']:self.assertIsNone(b.number(s))
  self.assertEqual(b.number('-115.5'),-115.5)
 def test_preferred_selected_before_numeric_availability(self):
  rows=[dict(code='X',median=None,caution=False),dict(code='X2',median=500,caution=True)]
  self.assertEqual(b.selected_ages(rows)[0]['code'],'X')
  self.assertIsNone(b.selected_ages(rows)[0]['median'])
 def test_pooled_failure_cautious(self):
  a={'SAMCODE':'TEST',b.AGE_CODE:'X1-PA(FST)',b.MEDIAN:'100','ABSOLUTE_LOWER_CALENDAR_AGE':'90','ABSOLUTE_UPPER_CALENDAR_AGE':'110','AGEC14':'80','COMMENTS':'','CALIBRATION_NOTES':'','DATE_SUSPECT':''}
  self.assertTrue(b.age(a,0)['caution'])
  a['COMMENTS']='Infinite age is >40000';self.assertIsNone(b.age(a,0)['c14'])
 def test_source_hashes_and_deployed_copies(self):
  audit=json.loads((b.OUT/'audit.json').read_text())
  for s in audit['source_files']:
   self.assertEqual(hashlib.sha256((b.RAW/s['file']).read_bytes()).hexdigest(),s['sha256'])
   self.assertEqual((b.RAW/s['file']).read_bytes(),(b.OUT/'raw'/s['file']).read_bytes())
 def test_unique_guard(self):
  with self.assertRaises(ValueError):b.unique([{'id':'A'},{'id':'A'}],['id'],'test')
if __name__=='__main__':unittest.main()
