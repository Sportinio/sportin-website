import Foundation
import Vision
import AppKit
let dir = CommandLine.arguments[1]
let files = try! FileManager.default.contentsOfDirectory(atPath: dir).filter{$0.hasSuffix(".jpg")}.sorted()
var out: [[[Double]]] = []
for f in files {
  guard let img = NSImage(contentsOf: URL(fileURLWithPath: dir + "/" + f)), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { out.append([]); continue }
  let req = VNDetectHumanRectanglesRequest(); req.upperBodyOnly = false
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
  out.append((req.results ?? []).map{ let b=$0.boundingBox; return [Double(b.minX), Double(1-b.maxY), Double(b.width), Double(b.height), Double($0.confidence)] })
}
FileManager.default.createFile(atPath: CommandLine.arguments[2], contents: try! JSONSerialization.data(withJSONObject: out))
print("frames", out.count)
